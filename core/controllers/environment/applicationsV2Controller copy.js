const AwsEnvironment = require('../../db/models/environment_application/awsEnvironment');
const EnvironmentModel = require('../../db/models/environment_application/environment');
const EnvironmentApplicationModel = require('../../db/models/environment_application/application');
const ApplicationAlarmModel = require('../../db/models/alarm/applicationAlarm');
const EnvironmentAlarmModel = require('../../db/models/environment_alarm/environmentAlarm');
const Provider = require('../../db/models/provider');
const config = require('../../utils/config').config;
const constants = require('../../utils/constants');
const queueService = require('../../queue');
const tokenService = require('../../utils/auth/tokenService');
const yup = require('yup');
const uuid = require('uuid/v4');
const logger = require('../../utils/logger');
const { getEnvironmentIdAndProviderName } = require('../helpers');
const AWS = require('aws-sdk');
const awsApiVersions = require('../../utils/awsApiVersions');
const ApplicationDeployment = require('../../db/models/applicationDeployment');
const { alarmStatusValues } = require('../../db/models/environment_alarm/alarmStatusValues');
const { alarmEffects } = require('../../db/models/environment_alarm/alarmEffects');


const EnvironmentService = require('../../db/models/environment/environment.service');

yup.addMethod(yup.array, 'unique', function (message, mapper = a => a) {
  return this.test('unique', message, function (list) {
    return list.length === new Set(list.map(mapper)).size;
  });
});

const appQueName = config.queueName;

const regions = [
  "us-west-2",
  "us-west-1",
  "us-east-2",
  "us-east-1",
  "ap-south-1",
  "ap-northeast-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ca-central-1",
  // "cn-north-1",
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "sa-east-1"
];

// declarations
exports.createAlb = createAlb;
// exports.deleteAlb = deleteAlb;
// exports.createNlb = createNlb;
// exports.deleteNlb = deleteNlb;
// exports.addListenerToAlb = addListenerToAlb;
// exports.deleteAlbListener = deleteAlbListener;
// exports.updateAlbListenerCertificate = updateAlbListenerCertificate;
// exports.listAlbs = listAlbs;
// exports.createECSCluster = createECSCluster;
// exports.createEcsInstanceGroup = createEcsInstanceGroup;
// exports.deleteEcsCluster = deleteEcsCluster;
// exports.deleteEcsInstanceGroup = deleteEcsInstanceGroup;
// exports.updateEcsClusterDependencies = updateEcsClusterDependencies;
// exports.listEcsClusters = listEcsClusters;
// exports.lockEnvironment = lockEnvironment;
// exports.dryRunEnvironment = dryRunEnvironment;
// exports.deployEnvironment = deployEnvironment;
// exports.getEnvironmentDetails = getEnvironmentDetails;
// exports.setEnvironmentStatus = setEnvironmentStatus;
// exports.getEnvironmentResources = getEnvironmentResources;
// exports.getApplicationResources = getApplicationResources;
// exports.activateApplication = activateApplication;
// exports.getApplicationDetailsForTF = getApplicationDetailsForTF;
// exports.dryRunApplication = dryRunApplication;
// exports.deployApplication = deployApplication;
// exports.destroyApplication = destroyApplication;
// exports.listEnvironmentApplications = listEnvironmentApplications;
// exports.listEnvironmentApplicationVersions = listEnvironmentApplicationVersions;
// exports.deleteApplication = deleteApplication;
// exports.deleteEnvironment = deleteEnvironment;
// exports.listApplicationDeployments = listApplicationDeployments;
// exports.listApplicationDeploymentsByDate = listApplicationDeploymentsByDate;
// exports.getApplicationLatestDeployment = getApplicationLatestDeployment;
// exports.setApplicationState = setApplicationState;
// exports.cloneEnvironment = cloneEnvironment;

// implementations


//-----------------------------------------
async function createAlb(req, res, next) {

  const name = req.params.name;
  const albName = uuid().substr(0, 32); // I assume this will always result in a unique name for ALBs in an environment
  const accountId = tokenService.getAccountIdFromToken(req);

  const { displayName } = req.body;
  if (!displayName) {
    res.sendStatus(constants.statusCodes.badRequest);
    return;
  }

  try {
    let result = await AwsEnvironment.addAlb(accountId, name, albName, displayName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function deleteAlb(req, res) {

  const { name: environmentName, albName } = req.params;

  const accountId = tokenService.getAccountIdFromToken(req);

  try {
    let result = await AwsEnvironment.deleteAlb(accountId, environmentName, albName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.status(constants.statusCodes.notFound).send({ message: "Invalid cluster name" });
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function createNlb(req, res) {

  const name = req.params.name;
  const nlbName = uuid().substr(0, 32); // I assume this will always result in a unique name for NLBs in an environment
  const accountId = tokenService.getAccountIdFromToken(req);


  const validationSchema = yup.object().shape({
    displayName: yup.string()
      .required(),
    isInternal: yup.boolean()
      .required()
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }


  const { displayName, isInternal } = req.body;
  if (!displayName) {
    res.sendStatus(constants.statusCodes.badRequest);
    return;
  }

  try {
    let result = await AwsEnvironment.addNlb(accountId, name, nlbName, displayName, isInternal);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.send({ name: nlbName });
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function deleteNlb(req, res) {

  const { name: environmentName, nlbName } = req.params;

  const accountId = tokenService.getAccountIdFromToken(req);

  try {
    let result = await AwsEnvironment.deleteNlb(accountId, environmentName, nlbName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.status(constants.statusCodes.notFound).send({ message: "Invalid cluster name" });
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function addListenerToAlb(req, res, next) {

  const environmentName = req.params.name;
  const albName = req.params.albName;
  const accountId = tokenService.getAccountIdFromToken(req);

  // Check if the provider is aws
  try {
    let result = await EnvironmentModel.getEnvironmentProviderName(accountId, environmentName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      if (result.output.providerName !== 'aws') {
        res.sendStatus(constants.statusCodes.badRequest);
        return
      }
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }

  const validationSchema = yup.object().shape({
    port: yup.number()
      .required(),
    protocol: yup.string()
      .required()
      .oneOf(['http', 'https']),
    certificateArn: yup.string()
      .when('protocol', {
        is: v => v === 'https',
        then: yup.string().required()
      })
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const { port, protocol, certificateArn } = req.body;

  try {
    let result = await AwsEnvironment.addListenerToAlb(accountId, environmentName, albName, port, protocol, certificateArn);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function deleteAlbListener(req, res) {

  const { name: environmentName, albName, port } = req.params;

  const accountId = tokenService.getAccountIdFromToken(req);

  try {
    let result = await AwsEnvironment.deleteAlbListener(accountId, environmentName, albName, port);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.status(constants.statusCodes.notFound).send({ message: "Invalid cluster name" });
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function updateAlbListenerCertificate(req, res, next) {

  const environmentName = req.params.name;
  const albName = req.params.albName;
  const port = req.params.port;
  const accountId = tokenService.getAccountIdFromToken(req);

  // Check if the provider is aws
  try {
    let result = await EnvironmentModel.getEnvironmentProviderName(accountId, environmentName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      if (result.output.providerName !== 'aws') {
        res.sendStatus(constants.statusCodes.badRequest);
        return
      }
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }

  const validationSchema = yup.object().shape({
    certificateArn: yup.string()
      .required()
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const { certificateArn } = req.body;
  try {
    let result = await AwsEnvironment.updateAlbListenerCertificate(accountId, environmentName, albName, port, certificateArn);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function listAlbs(req, res, next) {

  const name = req.params.name;
  const accountId = tokenService.getAccountIdFromToken(req);
  try {
    let result = await AwsEnvironment.listAlbs(accountId, name);
    console.log(result);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound);
        return;
      } else {
        res.sendStatus(constants.statusCodes.ise);
      }
    } else {
      res.send({
        data: result.output.albList
      });
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function createECSCluster(req, res) {

  const environmentName = req.params.name;
  const accountId = tokenService.getAccountIdFromToken(req);

  const validationSchema = yup.object().shape({
    displayName: yup.string().required(),
    dependencies: yup.object().shape({
      rdsNames: yup.array().of(yup.string())
        .unique('duplicate rds name'),
      albName: yup.string()
    })
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const { displayName, dependencies } = req.body;
  const clusterName = uuid().substr(0, 32); // I assume this will always result in a unique name for ecsCluster in an environment
  const cluster = {
    displayName,
    name: clusterName, // This is used to make the resource name unique, but we really don't need it and can rely on TF to assign a name
    dependencies,
  };

  try {
    let result = await AwsEnvironment.addEcsCluster(accountId, environmentName, cluster);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.status(constants.statusCodes.badRequest).send({ message: 'Cluster not found' });
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function createEcsInstanceGroup(req, res, next) {

  const environmentName = req.params.name;
  const clusterName = req.params.clusterName;
  const accountId = tokenService.getAccountIdFromToken(req);

  const validationSchema = yup.object().shape({
    displayName: yup.string()
      .max(50, "Maximum length is 50"),
    instanceType: yup.string()
      .max(100, "Maximum length is 100"),// TODO: Add oneOf validation
    count: yup.number()
      .required(),
    rootVolumeSize: yup.number()
      .required(),
    labels: yup.array().of(yup.string()),
    isSpot: yup.bool()
  });

  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  let ig = req.body;
  ig.name = uuid();

  try {
    let result = await AwsEnvironment.addEcsInstanceGroup(accountId, environmentName, clusterName, ig);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function deleteEcsCluster(req, res) {

  const { name: environmentName, clusterName } = req.params;

  const accountId = tokenService.getAccountIdFromToken(req);

  try {
    let result = await AwsEnvironment.deleteEcsCluster(accountId, environmentName, clusterName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.status(constants.statusCodes.notFound).send({ message: "Invalid cluster name" });
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function deleteEcsInstanceGroup(req, res) {

  const { name: environmentName, clusterName, igName } = req.params;

  const accountId = tokenService.getAccountIdFromToken(req);

  try {
    let result = await AwsEnvironment.deleteEcsInstanceGroup(accountId, environmentName, clusterName, igName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.status(constants.statusCodes.notFound).send({ message: "Invalid instance group" });
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function updateEcsClusterDependencies(req, res) {

  const environmentName = req.params.name;
  const clusterName = req.params.clusterName;
  const accountId = tokenService.getAccountIdFromToken(req);
  const validationSchema = yup.object().shape({
    dependencies: yup.object().shape({
      rdsNames: yup.array().of(yup.string())
        .unique('duplicate rds name'),
      albName: yup.string()
    }),
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  let { dependencies } = req.body;
  console.log(`dep`, dependencies);
  try {
    let result = await AwsEnvironment.updateEcsClusterDependencies(accountId, environmentName, clusterName, dependencies);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.status(constants.statusCodes.badRequest).send({ message: 'Cluster not found' });
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function listEcsClusters(req, res, next) {

  const name = req.params.name;
  const accountId = tokenService.getAccountIdFromToken(req);
  try {
    let result = await AwsEnvironment.listEcsClusters(accountId, name);
    console.log(result);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound);
        return;
      } else {
        res.sendStatus(constants.statusCodes.ise);
      }
    } else {
      res.send({
        data: result.output.ecsClusterList
      });
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function lockEnvironment(req, res, next) {
  const environmentName = req.params.name;
  const accountId = tokenService.getAccountIdFromToken(req);

  const validationSchema = yup.object().shape({
    lockId: yup.string().required()
  });

  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const { lockId } = req.body;

  try {
    let result = await EnvironmentModel.lockEnvironment(accountId, environmentName, lockId);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound); // environment not found or it's already locked
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
// This controller sends a message to the IW to dry-run an application
// IW must update the job status directly
async function dryRunEnvironment(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const environmentName = req.params.name;


  const { accessKeyId, secretAccessKey } = req.body;

  let jobPath;
  switch (res.locals.provider.backend.name) {
    case 'aws':
      jobPath = constants.jobPaths.dryRunAwsEnvironmentV2;
      break;
    default:
      res.status(constants.statusCodes.badRequest).send({ message: "Cloud provider not supported" });
  }

  const message = {
    jobPath,
    jobDetails: {
      userId,
      accountId,
      details: {
        environmentName,
        provider: res.locals.provider,
        credentials: {
          accessKeyId: accessKeyId || res.locals.credentials.accessKeyId,
          secretAccessKey: secretAccessKey || res.locals.credentials.secretAccessKey
        }
      }
    }
  };

  const options = {
    userId: message.jobDetails.userId,
    accountId: message.jobDetails.accountId,
    path: message.jobPath,
    jobDataBag: {
      environmentName
    }
  };
  try {
    const jobId = await queueService.sendMessage(appQueName, message, options);
    res.send(jobId);
  } catch (error) {
    console.log(`error: ${error.message}`);
    res.status(constants.statusCodes.ise).send({ message: 'Failed to schedule the job!' });
  }
}
//-----------------------------------------
// This controller sends a message to the IW to deploy an application
// IW must update the job status directly
async function deployEnvironment(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const environmentName = req.params.name;

  const { accessKeyId, secretAccessKey } = req.body;


  let jobPath;
  switch (res.locals.provider.backend.name) {
    case 'aws':
      jobPath = constants.jobPaths.deployAwsEnvironmentV2;
      break;
    default:
      res.status(constants.statusCodes.badRequest).send({ message: "Cloud provider not supported" });
  }

  // TODO: check the environment lock and also update the environment state

  const message = {
    jobPath,
    jobDetails: {
      userId,
      accountId,
      details: {
        environmentName,
        provider: res.locals.provider,
        credentials: {
          accessKeyId: accessKeyId || res.locals.credentials.accessKeyId,
          secretAccessKey: secretAccessKey || res.locals.credentials.secretAccessKey
        }
      }
    }
  };
  logger.verbose(`message: ${JSON.stringify(message, null, 2)}`);
  const options = {
    userId: message.jobDetails.userId,
    accountId: message.jobDetails.accountId,
    path: message.jobPath,
    jobDataBag: {
      environmentName
    }
  };
  try {
    const jobId = await queueService.sendMessage(appQueName, message, options);
    res.send(jobId);
  } catch (error) {
    console.log(`error: ${error.message}`);
    res.status(constants.statusCodes.ise).send({ message: 'Failed to schedule the job!' });
  }
}
//-----------------------------------------
async function getEnvironmentDetails(req, res) {

  const name = req.params.name;
  const accountId = tokenService.getAccountIdFromToken(req);
  try {
    let result = await EnvironmentModel.getEnvironmentDetails(accountId, name);
    console.log(result);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound);
        return;
      } else {
        res.sendStatus(constants.statusCodes.ise);
      }
    } else {
      res.send(result.output.environment);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function setEnvironmentStatus(req, res, next) {
  const environmentName = req.params.name;
  const accountId = tokenService.getAccountIdFromToken(req);

  const validationSchema = yup.object().shape({
    statusCode: yup.string()
      .required()
      .oneOf(['deployed', 'failed'])
  });

  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const { statusCode } = req.body;

  try {
    let result = await EnvironmentModel.setEnvironmentStatus(accountId, environmentName, statusCode);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound); // environment not found or it's already locked
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function activateApplication(req, res, next) {
  const environmentName = req.params.name;
  const applicationName = req.params.applicationName;
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProviderName(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  const validationSchema = yup.object().shape({
    version: yup.number()
      .required()
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }
  const version = req.body.version;

  try {
    let result = await EnvironmentApplicationModel.activateApplication(userId, environmentId, applicationName, Number(version));
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound); // application not found
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//----------------------------
async function getApplicationDetailsForTF(req, res, next) {
  //todo: add validation
  const accountId = tokenService.getAccountIdFromToken(req);
  const environmentName = req.params.name;
  const applicationName = req.params.applicationName;
  const version = req.query.version;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProviderName(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  try {
    let result = await EnvironmentApplicationModel.getForTf(environmentId, applicationName, version);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.send(result.output.app);
    }
  } catch (e) {
    console.log(e.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function tfActionApplication(action, req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const environmentName = req.params.name;
  const applicationName = req.params.applicationName;

  const validationSchema = yup.object().shape({
    accessKeyId: yup.string(),
    secretAccessKey: yup.string(),
    version: yup.number(),
    variables: yup.object(),
    externalDeployer: yup.string(),
    commitId: yup.string(),
    pipelineId: yup.string(),
    pipelineJobId: yup.string(),
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const { accessKeyId, secretAccessKey, variables = null, version = null } = req.body;

  let result = '';
  try {
    result = await EnvironmentModel.getEnvironmentProvider(accountId, environmentName); // here implicitly we check the environment belongs to the user
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }

  const environmentId = res.locals.environmentId;

  let applicationKind, activeVersion;
  try {
    const applicationKindResult = await EnvironmentApplicationModel.getApplicationKind(environmentId, applicationName);
    if (!applicationKindResult.success) {
      if (applicationKindResult.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    }
    applicationKind = applicationKindResult.output.kind;
    activeVersion = applicationKindResult.output.activeVersion;
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }

  const jobPaths = {
    dryRun: {
      [constants.applicationKinds.ecs]: constants.jobPaths.dryRunApplicationEcsV2,
      [constants.applicationKinds.s3Website]: constants.jobPaths.dryRunApplicationS3WebsiteV2,
      [constants.applicationKinds.classicBaked]: constants.jobPaths.dryRunApplicationClassicBakedV2
    },
    deploy: {
      [constants.applicationKinds.ecs]: constants.jobPaths.deployApplicationEcsV2,
      [constants.applicationKinds.s3Website]: constants.jobPaths.deployApplicationS3WebsiteV2,
      [constants.applicationKinds.classicBaked]: constants.jobPaths.deployApplicationClassicBakedV2
    },
    destroy: {
      [constants.applicationKinds.ecs]: constants.jobPaths.destroyApplicationEcsV2,
      [constants.applicationKinds.s3Website]: constants.jobPaths.destroyApplicationS3WebsiteV2,
      [constants.applicationKinds.classicBaked]: constants.jobPaths.destroyApplicationClassicBakedV2
    },
  };

  const jobPath = jobPaths[action][applicationKind];
  if (!jobPath) {
    console.error("invalid application kind");
    res.sendStatus(constants.statusCodes.ise);
    return;
  }

  const appVersion = version ? version : activeVersion;

  const message = {
    jobPath,
    jobDetails: {
      userId,
      accountId,
      details: {
        environmentName,
        applicationName,
        version: appVersion,
        variables,
        provider: res.locals.provider, //todo: don't send the whole provider here
        credentials: {
          accessKeyId: accessKeyId || res.locals.credentials.accessKeyId,
          secretAccessKey: secretAccessKey || res.locals.credentials.secretAccessKey
        }
      }
    }
  };
  const options = {
    userId: message.jobDetails.userId,
    accountId: message.jobDetails.accountId,
    path: message.jobPath,
    jobDataBag: {
      environmentName,
      applicationName,
      variables,
      version: appVersion,
    }
  };
  try {
    const jobId = await queueService.sendMessage(appQueName, message, options);
    if (action === 'deploy') {
      const deployment = {
        accountId,
        environmentName,
        applicationName,
        version: appVersion,
        jobId,
        deployer: userId,
        externalDeployer: req.body.externalDeployer,
        commitId: req.body.commitId,
        pipelineId: req.body.pipelineId,
        pipelineJobId: req.body.pipelineJobId,
        releaseTag: req.body.releaseTag,
        releaseNotes: req.body.releaseNotes,
        variables
      }
      await ApplicationDeployment.add(deployment);
    }
    if (action === 'deploy' || action === 'destroy') {
      const state = {
        code: action === 'deploy' ? 'deploying' : 'destroying',
        job: jobId
      }
      await EnvironmentApplicationModel.setState(environmentId, applicationName, state);
    }
    res.send(jobId);
  } catch (error) {
    console.error(`error: ${error.message}`);
    res.status(constants.statusCodes.ise).send('Failed to schedule the job!');
  }
}
//-----------------------------------------
// This controller sends a message to the IW to dry-run an application
// IW must update the job status directly
async function destroyApplication(req, res) {
  await tfActionApplication('destroy', req, res);
}
//-----------------------------------------
// This controller sends a message to the IW to dry-run an application
// IW must update the job status directly
async function dryRunApplication(req, res) {
  await tfActionApplication('dryRun', req, res);
}
//-----------------------------------------
// This controller sends a message to the IW to deploy an application
// IW must update the job status directly
async function deployApplication(req, res) {
  await tfActionApplication('deploy', req, res);
}
//----------------------------
async function listEnvironmentApplications(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const environmentName = req.params.name; // This can be null as two routes are handled here

  let environmentIds = [];
  try {
    let result = await EnvironmentModel.listEnvironmentIdsByAccount(accountId, environmentName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.duplicate) {
        res.sendStatus(constants.statusCodes.duplicate);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      environmentIds = result.output.environmentIds.map(e => e.id);
      if (!environmentIds.length) { // User doesn't have any environments, so no need to search for the environment databases
        res.send([]);
        return;
      }
    }
  } catch (error) {
    console.error(`error:`, error.message);
    res.sendStatus(constants.statusCodes.ise);
  }

  console.log(`environmentIds`, environmentIds);

  try {
    let result = await EnvironmentApplicationModel.listEnvironmentApplications(environmentIds);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      const applications = result.output.applications;
      // Get the status and effects of the alarms of the applications
      const alarmsResult = await ApplicationAlarmModel.listApplicationsAlarmStatus(applications.map(app => app.id))
      if (alarmsResult.success) {
        const alarmsObject = alarmsResult.output.alarms.reduce((acc, curr) => { acc[curr._id] = curr.alarms; return acc; }, {})
        const environmentsWithAlarms = [...applications];

        // Add alarms and status properties to each application object in the array
        environmentsWithAlarms.forEach(function (value, index) {
          let status = "";
          if (alarmsObject[value.id]) {
            const alarms = alarmsObject[value.id];

            // Set the status based on the alarms and their effect
            for (let i = 0; i < alarms.length; i++) {
              if (alarms[i].status === alarmStatusValues.alarm) {
                if (alarms[i].effect === alarmEffects.critical) {
                  status = "critical"; // As soon as we see a critical alarm we set the status and exit the loop
                  break;
                } else if (alarms[i].effect === alarmEffects.warning) {
                  status = "warning"; // If the we see a warning alarm we set the status to warning but still continue, we might see a critical alarm
                  break;
                }
              } else if (alarms[i].status === alarmStatusValues.insufficientData) {
                status = status !== alarmEffects.warning ? "insufficient data" : "warning";
              }
            }
            if (status === "") {
              status = "healthy";
            }

            this[index].alarms = alarms;
            this[index].status = status;

          }
        }, environmentsWithAlarms);

        res.send(environmentsWithAlarms);
      }


    }
  } catch (e) {
    console.log(e.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//----------------------------------------------
async function listEnvironmentApplicationVersions(req, res, next) {

  const accountId = tokenService.getAccountIdFromToken(req);
  const environmentName = req.params.name;

  // Check if the environment exist and get its id
  let environmentId;
  try {
    let result = await EnvironmentModel.getEnvironmentIdAndProvider(accountId, environmentName); // we don't use the provider here
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      environmentId = result.output.id;
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }
  const applicationName = req.params.applicationName;
  try {
    let result = await EnvironmentApplicationModel.listEnvironmentApplicationVersions(environmentId, applicationName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      res.send(result.output.applications);
    }
  } catch (e) {
    console.log(e.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function deleteApplication(req, res) {
  const environmentName = req.params.name;
  const applicationName = req.params.applicationName;
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProviderName(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  try {
    let result = await EnvironmentApplicationModel.deleteApplication(userId, environmentId, applicationName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound); // application not found
        return;
      } else if (result.message === "Cannot delete the environment, it needs to be destroyed first") {
        res.status(constants.statusCodes.badRequest).send("Cannot delete the environment, it needs to be destroyed first");
        return;
      } else {
        res.sendStatus(constants.statusCodes.ise);
      }
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
async function deleteEnvironment(req, res, next) {
  const environmentName = req.params.name;
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProviderName(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  try {
    let result = await EnvironmentModel.deleteEnvironment(userId, environmentId);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.notFound); // application not found
        return;
      } else if (result.message === "Cannot delete the environment, it needs to be destroyed first") {
        res.status(constants.statusCodes.badRequest).send("Cannot delete the environment, it needs to be destroyed first");
        return;
      }
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//-----------------------------------------
// This method pulls the state file from s3 for the environment and based on fields query extracts the root module outputs or entire state as the environment resources.
// If the state file is not found for any reason it responds with BAD_REQUEST
async function getEnvironmentResources(req, res, next) {
  const environmentName = req.params.name;
  const accountId = tokenService.getAccountIdFromToken(req);
  // Check if the environment belongs to the user
  const envProvider = await getEnvironmentIdAndProviderName(accountId, environmentName, res);
  if (!envProvider) {
    return;
  }
  let result = await Provider.getDetails(accountId, envProvider.providerDisplayName);
  console.log(result);
  if (!result.success) {
    if (result.message == constants.errorMessages.models.elementNotFound) {
      res.sendStatus(constants.statusCodes.notFound);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ise);
      return;
    }
  }
  const { bucketName, region } = result.output.provider;
  let credentials;
  try {
    const result = await Provider.getAccountCredentials(accountId, envProvider.providerDisplayName);
    if (!result.success) {
      res.status(constants.statusCodes.badRequest).send();
      return;
    }
    credentials = result.output.credentials;
  } catch (error) {
    console.log(`error: `, error.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }

  const baseConfig = {
    credentials,
    region
  }
  const s3 = getS3(baseConfig);
  try {
    const params = {
      Bucket: bucketName, //IMPORTANT: this object path should be kept in sync with inf-worker
      Key: `utopiops-water/applications/environment/${environmentName}`
    };
    const resp = await s3.getObject(params).promise();
    const state = JSON.parse(resp.Body.toString());
    console.log(JSON.stringify(state));
    const fields = req.query.fields //Sending response based on fields query
    if (fields === "[*]") {
      res.json(state)
      return
    }
    res.json(state.outputs)
  } catch (err) {
    console.log(`error: ${err.message} - ${err.code}`);
    if (err.code === "NoSuchKey") {
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    }
    res.sendStatus(constants.statusCodes.ise);
  }
}

//-----------------------------------------
// This method pulls the state file from s3 for the application and based on fields query extracts the root module outputs or entire state as the application resources.
// If the state file is not found for any reason it responds with BAD_REQUEST
async function getApplicationResources(req, res, next) {
  const environmentName = req.params.name;
  const applicationName = req.params.applicationName;
  const accountId = tokenService.getAccountIdFromToken(req);
  // Check if the environment belongs to the user
  const envProvider = await getEnvironmentIdAndProviderName(accountId, environmentName, res);
  if (!envProvider) {
    return;
  }
  let result = await Provider.getDetails(accountId, envProvider.providerDisplayName);
  console.log(result);
  if (!result.success) {
    if (result.message == constants.errorMessages.models.elementNotFound) {
      res.sendStatus(constants.statusCodes.notFound);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ise);
      return;
    }
  }
  const { bucketName, region } = result.output.provider;
  let credentials;
  try {
    const result = await Provider.getAccountCredentials(accountId, envProvider.providerDisplayName);
    if (!result.success) {
      res.status(constants.statusCodes.badRequest).send();
      return;
    }
    credentials = result.output.credentials;
  } catch (error) {
    console.log(`error: `, error.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }

  const baseConfig = {
    credentials,
    region
  }
  const s3 = getS3(baseConfig);
  try {
    const params = {
      Bucket: bucketName, //IMPORTANT: this object path should be kept in sync with inf-worker.
      // TODO: [MVP-386] Update the inf-worker to use the environment name instead of undefined, then update the key here
      Key: `utopiops-water/applications/environment/${environmentName}/application/${applicationName}`
    };
    const resp = await s3.getObject(params).promise();
    const state = JSON.parse(resp.Body.toString());
    console.log(JSON.stringify(state));

    const fields = req.query.fields //Sending response based on fields query
    if (fields === "[*]") {
      res.json(state)
      return
    }

    res.json(state.outputs)
  } catch (err) {
    console.log(`error: ${err.message} - ${err.code}`);
    if (err.code === "NoSuchKey") {
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    }
    res.sendStatus(constants.statusCodes.ise);
  }
}
//---------------------------------------------------
async function listApplicationDeployments(req, res) {
  const validationSchema = yup.object().shape({
    applicationName: yup.string(),
    environmentName: yup.string().when('applicationName', {
      is: undefined,
      otherwise: yup.string().required()
    })
  });
  try {
    validationSchema.validateSync(req.query);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const { environmentName, applicationName } = req.query;
  const accountId = tokenService.getAccountIdFromToken(req);
  const result = await ApplicationDeployment.list(accountId, environmentName, applicationName);
  if (result.success) {
    res.send(result.output.deployments);
  } else {
    if (result.message == constants.errorMessages.models.elementNotFound) {
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ise);
      return;
    }
  }
}
//---------------------------------------------------
async function listApplicationDeploymentsByDate(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const result = await ApplicationDeployment.listByDate(accountId);
  if (result.success) {
    res.send(result.output.deployments);
  } else {
    if (result.message == constants.errorMessages.models.elementNotFound) {
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ise);
      return;
    }
  }
}
//---------------------------------------------------
async function getApplicationLatestDeployment(req, res) {
  const { environmentName, applicationName } = req.params;
  const accountId = tokenService.getAccountIdFromToken(req);
  const result = await ApplicationDeployment.getApplicationLatestDeployment(accountId, environmentName, applicationName);
  if (result.success) {
    res.send(result.output.deployments);
  } else {
    if (result.message == constants.errorMessages.models.elementNotFound) {
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    } else {
      res.sendStatus(constants.statusCodes.ise);
      return;
    }
  }
}
//-----------------------------------------
async function setApplicationState(req, res) {
  const environmentName = req.params.name;
  const applicationName = req.params.applicationName;
  const accountId = tokenService.getAccountIdFromToken(req);

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProviderName(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  const validationSchema = yup.object().shape({
    code: yup.string().oneOf(['deployed', 'deploy_failed', 'destroyed', 'destroy_failed']).required(),
    job: yup.string().required()
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const state = req.body;

  try {
    let result = await EnvironmentApplicationModel.setState(environmentId, applicationName, state);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}

//-----------------------------------------
async function cloneEnvironment(req, res) {
  const environmentName = req.params.name;
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);

  const validationSchema = yup.object().shape({
    newEnvironmentName: yup.string().required(),
    newProvider: yup.string().required(),
    // We don't do any validations on the applications or databases to be cloned and simply jut clone whatever is valid. If use has used the UI everything should be valid ;)
    applications: yup.array().of(yup.string()),
    databases: yup.array().of(yup.string()),
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const { newEnvironmentName, newProvider, applications, databases } = req.body;

  try {
    let result = await EnvironmentModel.clone(accountId, userId, environmentName, newEnvironmentName, newProvider, { applications, databases });
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
    } else {
      res.send(result.result);
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}


//---------------------------------------------------

function getS3(baseConfig) {
  updateConfig(baseConfig);
  return new AWS.S3({
    apiVersion: awsApiVersions.s3
  });
}


function updateConfig(baseConfig) {
  AWS.config.update({
    region: baseConfig.region,
    accessKeyId: baseConfig.credentials.accessKeyId,
    secretAccessKey: baseConfig.credentials.secretAccessKey
  });
}