const EnvironmentApplication = require('../../db/models/environment_application/application');
const EnvironmentModel = require('../../db/models/environment_application/environment');
const constants = require('../../utils/constants');
const tokenService = require('../../utils/auth/tokenService');
const yup = require('yup');

exports.createOrUpdateEcsApplication = createOrUpdateEcsApplication;

//------------------------------------------------
async function createOrUpdateEcsApplication(req, res) {
  //todo: add validation
  const newAppDetails = req.body;
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const environmentName = req.params.name;

  const isFirstVersion = req.originalUrl.endsWith('application/ecs') ? true : false;
  const isUpdate = req.method === 'PUT' ? true : false;
  let version = 0;
  if (!isFirstVersion) {
    version = req.params.version;
  }

  // Check if the environment exist and it's provider is aws and get it's id
  let environmentId, providerName;
  try {
    let result = await EnvironmentModel.getEnvironmentIdAndProvider(accountId, environmentName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return
    } else {
      environmentId = result.output.id;
      providerName = result.output.providerName;
      if (providerName !== constants.applicationProviders.aws) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }

  // todo: check if the albId and clusterId are valid
  // todo: add validation

  try {

    // Add the new applications (in case of Create? or edit as well)
    const parsed = await parseApplication(newAppDetails);

    let appVersion = {
      kind: constants.applicationKinds.ecs,
      clusterId: parsed.clusterId,
      clusterName: parsed.clusterName,
      rds: parsed.rds,
      taskDefinition: parsed.taskDefinition,
      variables: parsed.variables,
      dnsSettings: parsed.dnsSettings,
      createdBy: userId,
      healthChecks: parsed.healthChecks,
    };

    if (isUpdate) {
      appVersion.version = version;
    } else if (!isFirstVersion) {
      appVersion.fromVersion = version;
    }


    let result = isFirstVersion ?
      await EnvironmentApplication.createEcsApplication(environmentId, parsed.name, parsed.description, appVersion) :
      isUpdate ?
        await EnvironmentApplication.updateEcsApplication(environmentId, parsed.name, parsed.description, appVersion) :
        await EnvironmentApplication.addEcsApplicationVersion(environmentId, parsed.name, parsed.description, appVersion, version);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (e) {
    console.error(`error:`, e.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}

async function parseApplication(application) {
  var appDetails = {
    name: application.basicSettings.applicationName,
    description: application.basicSettings.description,
    rds: application.serviceSettings.rds,
    clusterName: application.serviceSettings.clusterName,
    dnsSettings: {
      albName: application.serviceSettings.albName,
      ...(application.serviceSettings.certificate && {certificate: application.serviceSettings.certificate}),
      exposedAsPort: application.serviceSettings.exposedAsPort,
      containerToExpose: application.serviceSettings.containerToExpose,
      portToExpose: application.serviceSettings.portToExpose,
    },
    healthChecks: application.serviceSettings.healthChecks,
  };
  // Extract the app details that need pre-processing
  const { taskDefinition, variables } = extractTaskDefinition(application);
  appDetails.taskDefinition = taskDefinition;
  appDetails.variables = variables;
  return appDetails;
}

function extractTaskDefinition(platformDetails) {
  var taskDefinition = {};
  // General Details
  if (platformDetails['tdGeneralSettings']['taskRole'] !== 'none') { // TODO: Handle this in the front-end
    taskDefinition.taskRoleArn = platformDetails['tdGeneralSettings']['taskRole'];
  }

  taskDefinition.serviceDesiredCount = platformDetails.serviceSettings.desiredCount;
  taskDefinition.networkMode = platformDetails['tdGeneralSettings']['networkMode'];
  taskDefinition.cpu = platformDetails['tdGeneralSettings']['cpu'];
  taskDefinition.memory = platformDetails['tdGeneralSettings']['memory'];
  taskDefinition.tags = platformDetails['tdGeneralSettings']['tags'];
  const { containers, variables } = extractContainers(platformDetails.containers, platformDetails.variables);
  taskDefinition.containers = containers;
  taskDefinition.volumes = platformDetails['tdGeneralSettings']['volumes'];
  return {
    taskDefinition,
    variables
  };
}

function extractContainers(containersDetails, defaultValues) {
  var containers = [];
  var variables = []; // An array of objects { name, defaultValue} to store the default values of the variables (currently used only in the image TAG and container environment variables)

  containersDetails.map(cd => {
    var container = {};
    container.name = cd['containerName'];

    // ATM we just support public repositories and ECR. 
    // TODO: get rid of cd['dockerRepoUsername'], cd['dockerRepoPassword'] everywhere, ui, core?
    // TODO: let the users to refer to private repository.
    // TODO: Fix this shit, doesn't sound right! what the hell is dynamicImage?!
    if (cd['dynamicImage']) { // if this is true, container image TAG will be dynamically provided, so the image is gonna be determined by ECR and the user should provide the tag
      container.image = `$${cd['containerName']}_image_tag`; // the environment variable to expect should be ⏩<app name>-<container name>_image_tag⏪
      variables.push(
        {
          name: [`${cd['containerName']}_image_tag`],
          defaultValue: 'latest' // by default the tag ⏩latest⏪ will be used
        }
      );
    } else {
      container.image = cd['imageName']
    }

    // Set environment variables
    container.environment = [];

    if (/^\$[a-zA-Z].*$/.test(cd.imageName)) { // if the value is a variable (it starts with a single $ followed by a letter)
      variables.push(
        {
          name: cd.imageName,
          defaultValue: defaultValues[cd.imageName] || ''
        }
      );
    }

    cd['envVars'] && cd['envVars'].map(envVar => {
      if (/^\$[a-zA-Z].*$/.test(envVar['value'])) { // if the value is a variable (it starts with a single $ followed by a letter)
        variables.push(
          {
            name: envVar['value'],
            defaultValue: defaultValues[envVar['value']] || ''
          }
        );
      }
      container.environment.push({
        name: envVar['key'],
        value: envVar['value']
      });
    });

    // Set secrets
    container.secrets = [];
    cd['secrets'] && cd['secrets'].map(secret => container.secrets.push({
      name: secret['key'],
      valueFrom: secret['value']
    }));

    // Set port mappings
    container.portMappings = [];
    cd['ports'] && cd['ports'].map(pm => {
      var toPush = {
        containerPort: Number(pm['port'])
      };
      // Check if host port is not to be dynamically assigned (Note: we don't even set this at the moment)
      toPush.hostPort = pm['hostPort'] ? Number(pm['hostPort']) : 0;
      // Check if protocol is set (Note: we don't even set this at the moment)
      toPush.protocol = pm['protocol'] ? pm['protocol'] : 'tcp';
      container.portMappings.push(toPush);
    });

    // Set soft limit and/or hard limit
    container.memoryReservation = cd['memoryRequest'];
    container.memory = cd['memoryLimit'];

    // container.cpuReservation = cd['cpuRequest']; // TODO: Should I set this?
    container.cpu = cd['cpuRequest'];

    container.essential = cd['essential'];

    // Set volumes
    container.mountPoints = cd['mountPoints'];
    container.injectedEnvironmentVariables = cd['injectedEnvironmentVariables'];

    // TODO: add other properties like volumes, logs ...

    containers.push(container);
  });

  return {
    containers,
    variables
  };
}
