const EnvironmentApplication = require('../../db/models/environment_application/application');
const EnvironmentModel = require('../../db/models/environment_application/environment');
const constants = require('../../utils/constants');
const tokenService = require('../../utils/auth/tokenService');
const yup = require('yup');

exports.createOrUpdateClassicBakedApplication = createOrUpdateClassicBakedApplication;

//------------------------------------------------
async function createOrUpdateClassicBakedApplication(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const environmentName = req.params.name;

  // We handle multiple endpoints with this controller, so here we try to find out which path it is
  const isFirstVersion = req.originalUrl.endsWith('application/classic-baked') ? true : false;
  const isUpdate = req.method === 'PUT' ? true : false;
  let version = 0;
  if (!isFirstVersion) {
    version = req.params.version;
  }

  console.log(`req.body`, req.body);


  // Schema validation
  const validationSchema = yup.object().shape({
    name: yup.string()
      .required(),
    description: yup.string(),
    iamRoleName: yup.string(),
    defaultAmiId: yup.string()
      .required(),
    portsExposed: yup.object().shape({
      lb: yup.object().shape({
        name: yup.string().required(),
        useForDns: yup.boolean(), 
        dnsPrefix: yup.string(),
        ports: yup.array().of(yup.number()) // Limitation: At the moment we assume EC2 receives traffic from the ALB on the same port as it's exposed on ALB
      }).default(undefined),
      nlb: yup.object().shape({
        name: yup.string().required(),
        useForDns: yup.boolean(),
        dnsPrefix: yup.string(),
        ports: yup.array().of(yup.object().shape({
          portNumber: yup.number().required(),
          protocol: yup.string().
            oneOf(['tcp', 'tls', 'udp', 'tcp_udp'])
            .required(),
          certificateArn: yup.string().when('protocol', {
            is: v => v === 'tls',
            then: yup.string().required()
          })
        }))
      }).default(undefined)
    }),
    instanceGroups: yup.array().of(
      yup.object().shape({
        displayName: yup.string()
          .max(50, "Maximum length is 50"),
        userData: yup.string(),
        instanceType: yup.string()
          .required(),// TODO: Add oneOf validation
        count: yup.number()
          .required(),
        rootVolumeSize: yup.number()
          .required(),
        labels: yup.array().of(yup.string())
      })
    )
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
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

  // todo: check if the lb.id is valid and the ports are exposed in the lb

  try {

    let appVersion = {
      ...req.body,
      kind: constants.applicationKinds.classicBaked,
      createdBy: userId
    };

    if (isUpdate) {
      appVersion.version = version;
    } else if (!isFirstVersion) {
      appVersion.fromVersion = version;
    }

    // By default we add a variable to the application to be able to deploy different AMIs
    appVersion.variables = [{
      name: 'ami',
      value: appVersion.defaultAmiId
    }];

    console.log(`isFirstVersion `, isFirstVersion);
    console.log(`isUpdate `, isUpdate);

    let result = isFirstVersion ?
      await EnvironmentApplication.createClassicBakedApplication(environmentId, appVersion.name, appVersion.description, appVersion) :
      isUpdate ?
        await EnvironmentApplication.updateClassicBakedApplication(environmentId, appVersion.name, appVersion.description, appVersion) :
        await EnvironmentApplication.addClassicBakedApplicationVersion(environmentId, appVersion.name, appVersion.description, appVersion, version);
    if (!result.success) {
      switch (result.message) {
        case constants.errorMessages.models.elementNotFound:
          res.sendStatus(constants.statusCodes.badRequest);
          break;
        case constants.errorMessages.models.duplicate:
          res.sendStatus(constants.statusCodes.duplicate);
          break;
        default:
          res.sendStatus(constants.statusCodes.ise);
      }
    } else {
      res.send(result.outputs);
    }
  } catch (e) {
    console.log(e.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
