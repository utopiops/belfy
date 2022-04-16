"use strict";

const constants = require('../../../utils/constants');
const { runQueryHelper } = require('../helpers');
const Provider = require('./provider');
const queueService = require('../../../queue');
const ObjectId = require('mongoose').Types.ObjectId;
const { encrypt } = require('../../../utils/encryption');
const { config } = require('../../../utils/config');
const uuidv4 = require('uuid/v4');

const { defaultLogger: logger } = require('../../../logger')

module.exports = {
  addDigitalOceanProvider,
  updateDigitalOceanProviderCredentials
}

//-----------------------------------------------
async function addDigitalOceanProvider({ accountId, userId, displayName, region, spacesAccessKeyId, spacesSecretAccessKey, digitalOceanToken }) {
  /*
  Steps taken in this function:
  
    1. Get the cloud provider account Id using accessKeyId and secretAccessKey
    2. Encrypt the accessKeyId and secretAccessKey pair
    3. Save the aws provider based on the parameters
    4. Set the log provider to CloudWatch (default for AWS) // TODO: fix this, doesn't make sense. Let the users pick different log providers per application
    5. Send a message to infw to deploy the provider
  */

  try {
    
    const toAdd = new Provider({
      accountId,
      displayName,
      backend: {
        name: 'do',
        digitalOceanToken: encrypt(digitalOceanToken),
        spacesAccessKeyId: encrypt(spacesAccessKeyId),
        spacesSecretAccessKey: encrypt(spacesSecretAccessKey),
        bucketName: `tfstate${uuidv4().replace(/-/g, "").substr(0, 17)}`, // Azure limitations (24 characters max)
        region,
        stateKey: uuidv4()
      }
    });
    const provider = new Provider(toAdd);
    await provider.save();

    // todo: add log service

    const message = {
      jobPath: constants.jobPaths.createDigitalOceanProvider,
      jobDetails: {
        accountId,
        userId,
        details: {
          displayName: provider.displayName,
          name: provider.backend.name,
          region: provider.backend.region,
          bucketName: provider.backend.bucketName,
          stateKey: provider.backend.stateKey,
          credentials: {
            spacesAccessKeyId,
            spacesSecretAccessKey,
            digitalOceanToken
          }
        },
        extras: {
          operation: constants.operations.create
        }
      }
    };
    logger.verbose(message);
    const jobId = await queueService.sendMessage(config.queueName, message, {
      accountId,
      userId,
      path: constants.jobPaths.createDigitalOceanProvider
    });
    await setJobId(accountId, displayName, jobId);
    return {
      success: true,
      outputs: { jobId }
    }
  } catch (err) {
    logger.error(err);
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
//----------------------------------------
async function updateDigitalOceanProviderCredentials(accountId, displayName, credentials) {

  const runQuery = async () => {
    // We user the account extracted from the credentials in the query to make sure it's not changing
    const filter = { accountId: new ObjectId(accountId), displayName , 'backend.name': 'do' };
    const update = {
      $set: {
        'backend.digitalOceanToken': encrypt(credentials.digitalOceanToken),
        'backend.spacesAccessKeyId': encrypt(credentials.spacesAccessKeyId),
        'backend.spacesSecretAccessKey': encrypt(credentials.spacesSecretAccessKey),
      }
    }
    return await Provider.findOneAndUpdate(filter, update, { new: true }).exec();
  };
  return await runQueryHelper(runQuery);
}
//----------------------------------------
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
