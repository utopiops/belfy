"use strict";
const constants = require('../../../utils/constants');
const { runQueryHelper } = require('../helpers');
const Provider = require('./provider');
const Environment = require('../environment_application/environment');
const Environment_v2 = require('../environment/environment');
const queueService = require('../../../queue');
const logmetricService = require('../../../services/logmetric');
const ObjectId = require('mongoose').Types.ObjectId;
const AWS = require('aws-sdk');
const awsApiVersions = require('../../../utils/awsApiVersions');
const { encrypt } = require('../../../utils/encryption');
const { config } = require('../../../utils/config');
const uuidv4 = require('uuid/v4');
const azureProvider = require('./azureProvider.service');
const digitalOceanProvider = require('./digitalOceanProvider.service');
const gcpProvider = require('./gcpProvider.service');

const { defaultLogger: logger } = require('../../../logger')

module.exports = {
  getProviderDetails,
  getProviderCredentials,
  getProviderStatus,
  getEnabledProviders,
  testProvider,
  updateCredentials,
  deployProvider,
  addAwsProvider,
  deleteProvider,
  deleteProviderAfterJobDone,
  updateProviderStatus,
  listProviderSummaries,
  ...azureProvider,
  ...digitalOceanProvider,
  ...gcpProvider
}

//-----------------------------------------------
async function getProviderDetails(accountId, displayName) {

  const runQuery = async () => {
    const filter = { accountId: new ObjectId(accountId), displayName };
    return await Provider.findOne(filter, { _id: 0 }).exec();
  };
  const extractOutput = (result) => ({ 
    state: result.state.code,
     ...result.backend.summary 
    });
  return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------------
async function getProviderCredentials(accountId, displayName) {

  const runQuery = async () => {
    const filter = { accountId: new ObjectId(accountId), displayName };
    return await Provider.findOne(filter, { _id: 0 }).exec();
  };
  const extractOutput = (result) => (result.backend.decryptedCredentials);
  return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------------
async function getProviderStatus(accountId, displayName) {

  const runQuery = async () => {
    const filter = { accountId: new ObjectId(accountId), displayName };
    return await Provider.findOne(filter, { state: true }).exec();
  };
  const extractOutput = (result) => result.state.code;
  return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------------
async function getEnabledProviders(accountId) {

  const runQuery = async () => {
    const filter = { accountId: new ObjectId(accountId) };
    return await Provider.aggregate([
      {
        $match: filter
      },
      {
        $group: {
          _id: { accountId: "$accountId", name: "$backend.name" }
        }
      },
      {
        $project: { '_id.name': 1 }
      }
    ]).exec();

  };
  const extractOutput = (result) => result && result.length ? result.map(r => r._id.name) : null;
  return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------------
async function listProviderSummaries(accountId, name = null) {

  const runQuery = async () => {
    const filter = {
      accountId: new ObjectId(accountId),
      ...(name ? { 'backend.name': name } : {})
    };
    return await Provider.find(filter).exec();
  };
  const extractOutput = (result) => result.map((p) => ({ id: p._id, displayName: p.displayName, state: p.state.code, ...p.backend.summary, jobId: p.state.job }));
  return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------------
async function testProvider(accessKeyId, secretAccessKey) {

  try {
    AWS.config.update({
      accessKeyId,
      secretAccessKey
    });
    const sts = new AWS.STS({ apiVersion: awsApiVersions.sts });
    await sts.getCallerIdentity().promise();
    return {
      success: true
    }
  } catch (error) {
    return {
      success: false,
      message: constants.errorMessages.models.elementNotFound // we send this so the controller responds with bad request
    }
  }
}
//-----------------------------------------------
async function updateCredentials(accountId, displayName, credentials) {

  // First need to pull the cloud provider account from the credentials
  let newUserIdentity;
  try {
    AWS.config.update({
      accessKeyId: credentials.accessKeyId,
      secretAccessKey: credentials.secretAccessKey
    });
    const sts = new AWS.STS({ apiVersion: awsApiVersions.sts });
    newUserIdentity = await sts.getCallerIdentity().promise();
  } catch (err) {
    console.error(`error:`, err);
    return {
      success: false,
      message: constants.errorMessages.models.elementNotFound // we send this so the controller responds with bad request
    }
  }

  const runQuery = async () => {
    // We user the account extracted from the credentials in the query to make sure it's not changing
    const filter = { accountId: new ObjectId(accountId), displayName, 'backend.cloudProviderAccountId': newUserIdentity.Account };
    const update = {
      $set: {
        'backend.accessKeyId': encrypt(credentials.accessKeyId),
        'backend.secretAccessKey': encrypt(credentials.secretAccessKey),
      }
    }
    return await Provider.findOneAndUpdate(filter, update, { new: true }).exec();
  };
  return await runQueryHelper(runQuery);
}
//-----------------------------------------------
async function updateProviderStatus({ accountId, displayName, kind, status, kmsKeyId }) {
  const runQuery = async () => {
    // We user the account extracted from the credentials in the query to make sure it's not changing
    const filter = { accountId: new ObjectId(accountId), displayName, 'backend.name': kind };   
     const update = {
      $set: {
        'state.code' : status,
        ...(kmsKeyId ? { 'backend.kmsKeyId': kmsKeyId } : {})
      }
    }
    return await Provider.findOneAndUpdate(filter, update, { new: true }).exec();
  };
  return await runQueryHelper(runQuery);
}
//-----------------------------------------------
async function deployProvider(accountId, userId, displayName) {
  const runQuery = async () => {
    const filter = { accountId: new ObjectId(accountId), displayName };
    return await Provider.findOne(filter, { _id: 0 }).exec();
  };
  const extractOutput = (result) => result;
  const result = await runQueryHelper(runQuery, extractOutput);
  if (!result.success) {
    return result;
  }

  try {
    const provider = result.outputs;
    if (provider.state.code === constants.resourceStatus.deploying || provider.state.code === constants.resourceStatus.destroying ) {
      return {
        success: false,
        error: {
          message: `Please wait for the provider ${provider.displayName} to finish deploying or destroying`,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }
    const credentials = provider.backend.decryptedCredentials;

    const message = {
      jobType: constants.topics.addProvider, // todo: remove this
      jobPath: constants.jobPaths.createApplicationAwsProviderV2,
      jobDetails: {
        accountId,
        userId,
        details: {
          displayName: provider.displayName,
          name: provider.backend.name,
          region: provider.backend.region,
          bucketName: provider.backend.bucketName,
          dynamodbName: provider.backend.dynamodbName,
          kmsKeyId: provider.backend.kmsKeyId,
          stateKey: provider.backend.stateKey,
          credentials
        },
        extras: {
          operation: constants.operations.create
        }
      }
    };
    const jobId = await queueService.sendMessage(config.queueName, message, {
      accountId,
      userId,
      path: constants.jobPaths.createApplicationAwsProviderV2
    });
    await setJobId(accountId, displayName, jobId);
    return {
      success: true,
      outputs: { jobId }
    }

  } catch (error) {
    console.error(error.message);
    return {
      success: false
    }
  }
}


//-----------------------------------------------
async function addAwsProvider({ accountId, userId, displayName, accessKeyId, secretAccessKey, region }) {
  /*
  Steps taken in this function:
  
    1. Get the cloud provider account Id using accessKeyId and secretAccessKey
    2. Encrypt the accessKeyId and secretAccessKey pair
    3. Save the aws provider based on the parameters
    4. Set the log provider to CloudWatch (default for AWS) // TODO: fix this, doesn't make sense. Let the users pick different log providers per application
    5. Send a message to infw to deploy the provider
  */
  let userIdentity
  try {
    AWS.config.update({
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    });
    const sts = new AWS.STS({ apiVersion: awsApiVersions.sts });
    userIdentity = await sts.getCallerIdentity().promise();
  } catch (error) {
    console.error(`error`, error);
    return {
      success: false,
      error: {
        message: 'Provider credentials are invalid',
        statusCode: constants.statusCodes.badRequest
      }
    }
  }

  try {
    const bucketName = uuidv4();
    const dynamodbName = uuidv4();
    const stateKey = uuidv4();
    const toAdd = new Provider({
      accountId,
      displayName,
      backend: {
        name: 'aws',
        accessKeyId: encrypt(accessKeyId),
        secretAccessKey: encrypt(secretAccessKey),
        cloudProviderAccountId: userIdentity.Account,
        region,
        bucketName,
        dynamodbName,
        stateKey
      }
    });
    const provider = new Provider(toAdd);
    await provider.save();

    const cloudwatch = {
      accountId,
      name: 'CloudWatch',
      serviceProvider: 'cloudwatch',
      isLogProvider: true,
      isMetricProvider: true
    };
    const ret = await logmetricService.add(cloudwatch);
    console.log(`ret: ${JSON.stringify(ret)}`);
    if (!ret) {
      // TODO: implement rollback
      throw new Error('Failed to add the logmetric provider');
    }
    const message = {
      jobPath: constants.jobPaths.createApplicationAwsProviderV2,
      jobDetails: {
        accountId,
        userId,
        details: {
          displayName: provider.displayName,
          name: provider.backend.name,
          region: provider.backend.region,
          bucketName: provider.backend.bucketName,
          dynamodbName: provider.backend.dynamodbName,
          kmsKeyId: provider.backend.kmsKeyId,
          stateKey: provider.backend.stateKey,
          credentials: {
            accessKeyId,
            secretAccessKey
          }
        },
        extras: {
          operation: constants.operations.create
        }
      }
    };
    const jobId = await queueService.sendMessage(config.queueName, message, {
      accountId,
      userId,
      path: constants.jobPaths.createApplicationAwsProviderV2
    });
    await setJobId(accountId, displayName, jobId);
    return {
      success: true,
      outputs: { jobId }
    }
  } catch (err) {
    console.error(`error`, err);
    let error = {
      message : err.message,
      statusCode: constants.statusCodes.badRequest
    }
    if (err.code && err.code === 11000) {
      error.message = `Provider with the name ${displayName} already exists`;
    }
    return {
      success: false,
      error
    };
  }
}

//-----------------------------------------------
async function deleteProvider({ accountId, userId, displayName }) {

  /*
    0. Get the provider details
    1. Check if the provider can be deleted, no environment should be using it
    2. Check if the provider has ever been deployed:
      if no:
        just delete it
      if yes:
        send a message to infw to destroy it which later will send a message to delete it
  */

  const runQuery = async () => {
    const filter = { accountId: new ObjectId(accountId), displayName };
    return await Provider.findOne(filter).exec();
  };
  const extractOutput = (result) => result;
  const result = await runQueryHelper(runQuery, extractOutput);

  if (!result.success) {
    return result;
  }
  const provider = result.outputs;

  const runQuery2 = async () => {
    const providerId = new ObjectId(provider._id);
    var filter = { provider: providerId };
    const count = await Environment_v2.countDocuments(filter).exec();
    return { count };
  };
  const extractOutput2 = result => result;
  const result2 = await runQueryHelper(runQuery2, extractOutput2);

  if (!result2.success) {
    return result2;
  }
  if (result2.outputs.count != 0) {
    return {
      success: false,
      error: {
        message: `Provider ${provider.displayName} cannot be deleted because it is in use. please delete its environments first.`,
        statusCode: constants.statusCodes.badRequest
      }
    };
  }
  
  if (provider.state.code === constants.resourceStatus.deploying || provider.state.code === constants.resourceStatus.destroying ) {
    return {
      success: false,
      error: {
        message: `Please wait for the provider ${provider.displayName} to finish deploying or destroying`,
        statusCode: constants.statusCodes.badRequest
      }
    };
  }

  let jobPath, message; // These two are set based on the provider's backend name
  if (provider.backend.name === constants.cloudProviders.azure) {
    jobPath = constants.jobPaths.destroyAzureProviderV2;
    message = {
      jobPath,
      jobDetails: {
        accountId,
        userId,
        details: {
          displayName: provider.displayName,
          name: provider.backend.name,
          region: provider.backend.region,
          location: provider.backend.location,
          resourceGroupName: provider.backend.resourceGroupName,
          storageAccountName: provider.backend.storageAccountName,
          stateKey: provider.backend.stateKey,
          credentials: provider.backend.decryptedCredentials
        },
      }
    };
  } else if (provider.backend.name === constants.cloudProviders.digitalOcean) {
    jobPath = constants.jobPaths.destroyDigitalOceanProvider;
    message = {
      jobPath,
      jobDetails: {
        accountId,
        userId,
        details: {
          displayName: provider.displayName,
          name: provider.backend.name,
          region: provider.backend.region,
          bucketName: provider.backend.bucketName,
          stateKey: provider.backend.stateKey,
          credentials: provider.backend.decryptedCredentials
        },
      }
    };
  } else if (provider.backend.name === constants.cloudProviders.gcp) {
    jobPath = constants.jobPaths.destroyGcpProvider;
    message = {
      jobPath,
      jobDetails: {
        accountId,
        userId,
        details: {
          displayName: provider.displayName,
          name: provider.backend.name,
          region: provider.backend.region,
          bucketName: provider.backend.bucketName,
          projectId: provider.backend.projectId,
          stateKey: provider.backend.stateKey,
          credentials: provider.backend.decryptedCredentials
        },
      }
    };
  } else { // Default is AWS for backwards compatibility
    jobPath = constants.jobPaths.destroyApplicationAwsProviderV2;
    message = {
      jobPath,
      jobDetails: {
        accountId,
        userId,
        details: {
          name: provider.backend.name,
          displayName,
          region: provider.backend.region,
          bucketName: provider.backend.bucketName,
          dynamodbName: provider.backend.dynamodbName,
          kmsKeyId: provider.backend.kmsKeyId,
          stateKey: provider.backend.stateKey,
          credentials: provider.backend.decryptedCredentials
        }
      }
    };
  }
  const options = {
    userId,
    accountId,
    path: jobPath
  };

  try {
    const jobId = await queueService.sendMessage(config.queueName, message, options);
    await setJobId(accountId, displayName, jobId);
    await setState(accountId, displayName, constants.resourceStatus.destroying);
    return {
      success: true,
      outputs: jobId
    }
  } catch (error) {
    logger.error(error)
    return {
      success: false
    }
  }
}
//-----------------------------------------------
async function deleteProviderAfterJobDone({ accountId, displayName }) {

  const runQuery = async () => {
    const filter = { accountId: new ObjectId(accountId), displayName };
    return await Provider.findOne(filter).exec();
  };
  const extractOutput = (result) => result;
  const result = await runQueryHelper(runQuery, extractOutput);

  if (!result.success) {
    return result;
  }
  const provider = result.outputs;

  const runQuery2 = async () => {
    const providerId = new ObjectId(provider._id);
    var filter = { provider: providerId };
    const count_tmp = await Environment.countDocuments(filter).exec(); // TODO: get rid of this
    const count = await Environment_v2.countDocuments(filter).exec();
    return { count: count_tmp + count };
  };
  const extractOutput2 = result => result;
  const result2 = await runQueryHelper(runQuery2, extractOutput2);

  if (!result2.success) {
    return result2;
  }
  if (result2.outputs.count != 0) { // This is really weird, it shouldn't happen, otherwise why did we destroy it?
    return {
      success: false,
      message: constants.errorMessages.models.elementNotFound // we send this so the controller responds with bad request
    }
  }
  try {
    await Provider.findByIdAndRemove(provider._id).exec();
    return {
      success: true
    }
  } catch (error) {
    logger.error(error)
    return {
      success: false
    }
  }

}

//-----------------------------------------------
async function getAccountCredentials(accountId, displayName) {
  var filter = { accountId: new ObjectId(accountId), displayName };
  try {
    const result = await this.findOne(filter, { backend: 1 }).exec();
    if (result == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    const credentials = result.backend.credentials;
    return {
      success: true,
      output: {
        credentials
      }
    };
  } catch (err) {
    console.error(`error`, err);
    let message = err.message;
    return {
      success: false,
      message: message
    };
  }
}
//-----------------------------------------------
async function getSameTypeProviders(accountId, backendName, displayName) {
  var filter = { accountId: new ObjectId(accountId), 'backend.name': backendName, displayName: { $ne: displayName } };
  try {
    const result = await this.find(filter, { displayName: 1 }).exec();
    return {
      success: true,
      output: {
        // This is for backwards compatibility. replace it everywhere with outputs
        providers: result.map((r) => r.displayName)
      },
      outputs: {
        providers: result.map((r) => r.displayName)
      }
    };
  } catch (err) {
    console.error(`error: `, err.message);
    return {
      success: false,
      message: err.message
    };
  }
}

async function canDeleteProvider(accountId, displayName) {
  try {
    const result = await this.getProvider(accountId, displayName);
    console.log(result); // !!!
    if (!result.success) {
      return result;
    }

    const provider = result.output.provider;
    const providerId = new ObjectId(provider._id);
    var filter = { provider: providerId };
    const environment = await Environment.findOne(filter).exec();
    if (environment != null) {
      return {
        success: false,
        message: "We can't delete provider"
      };
    }
    return {
      success: true,
      output: {
        provider
      }
    };
  } catch (error) {
    console.error(`error: `, err.message);
    return {
      success: false,
      message: err.message
    };
  }
}

async function getProvider(accountId, displayName) {
  var filter = { accountId: new ObjectId(accountId), displayName };
  try {
    const result = await this.findOne(filter).exec();
    if (result == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true,
      output: {
        provider: result
      }
    };
  } catch (err) {
    console.error(`error: `, err.message);
    console.log(err); // !!!
    return {
      success: false,
      message: err.message
    };
  }
}


async function setJobId(accountId, displayName, jobId) {
  const filter = { 
    accountId,
    displayName
  };
  let update = {
    $set: {"state.job": jobId }
  }
  let arrayFilters = []
  return await Provider.findOneAndUpdate(filter, update).exec();
}


async function setState(accountId, displayName, state) {
  const filter = { 
    accountId,
    displayName
  };
  let update = {
    $set: {"state.code": state }
  }
  let arrayFilters = []
  return await Provider.findOneAndUpdate(filter, update).exec();
}
