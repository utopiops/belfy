const DomainModel = require('./domain');
const { defaultLogger: logger } = require('../../../logger');
const constants = require('../../../utils/constants');
const config = require('../../../utils/config').config;
const queueService = require('../../../queue');
const AWS = require('aws-sdk');
const awsApiVersions = require('../../../utils/awsApiVersions');
const appQueName = config.queueName;

module.exports = {
  listDomains,
  addDomain,
  deleteDomain,
  tfActionDomain,
  setState,
  updateDomain,
  getDomainResources
};

async function addDomain(domainName, accountId, userId) {
  try {
    const doc = new DomainModel({
      domainName,
      accountId,
      createdBy: userId,
    });
    await doc.save();

    return {
      success: true,
    };
  } catch (err) {
    logger.error(err);
    if (err.code && err.code === 11000) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.duplicate,
          statusCode: constants.statusCodes.badRequest,
        },
      };
    }
    return {
      success: false,
    };
  }
}
// -------------------------------------------
async function listDomains(accountId) {
  try {
    const filter = { accountId };
    const doc = await DomainModel.find(filter, {createCertificate : 1, domainName: 1, state: 1, _id: 0}).exec();

    return {
      success: true,
      outputs: doc,
    };

  } catch (err) {
    logger.error(err);
    return {
      success: false,
    };
  }
}
// -------------------------------------------
async function deleteDomain(domainName, accountId) {
  try {
    const filter = { accountId, domainName };
    const doc = await DomainModel.findOne(filter).exec();

    if (doc == null) {
      return {
        success: false,
        error: {
          message: 'domain not found.',
          statusCode: constants.statusCodes.notFound,
        },
      };
    }

    switch (doc.state.code) {
      case 'deploying':
      case 'destroying':
        return {
          success: false,
          error: {
            message:
              'domain is currently being deployed or destroyed. please wait for it to finish.',
            statusCode: constants.statusCodes.badRequest,
          },
        };
      case 'deployed':
      case 'deploy_failed':
      case 'destroy_failed':
        return {
          success: false,
          error: {
            message: 'please destroy the domain before deleting it.',
            statusCode: constants.statusCodes.badRequest,
          },
        };

      default:
        break;
    }

    // TODO: check if there are any application with this domain before deleting it

    await DomainModel.findOneAndDelete(filter).exec();

    return {
      success: true,
    };
  } catch (err) {
    logger.error(err);
    return {
      success: false,
    };
  }
}
// ---------------------------------------
async function tfActionDomain(action, userId, accountId, jobPath, domainName) {
  const domain = await DomainModel.findOne({ domainName, accountId }).exec();

  const message = {
    jobPath,
    jobDetails: {
      userId,
      accountId,
      details: {
        ...domain._doc,
      },
    },
  };

  logger.info(`message:: ${message}`);

  const options = {
    userId: message.jobDetails.userId,
    accountId: message.jobDetails.accountId,
    path: message.jobPath,
    jobDataBag: {
      ...domain._doc,
    },
  };

  try {
    const jobId = await queueService.sendMessage(appQueName, message, options);
    // TODO: send job notification
    const state = {
      code: action === 'deploy' ? 'deploying' : 'destroying',
      job: jobId,
    };
    await setState(accountId, domainName, state);

    return {
      success: true,
      outputs: jobId,
    };
  } catch (error) {
    logger.error(error);

    if (
      error.message === 'failed to schedule the job' &&
      ['deploy', 'destroy'].indexOf(action) !== -1
    ) {
      const state = {
        code: action === 'deploy' ? 'deploy_failed' : 'destroy_failed',
      };
      await setState(accountId, domainName, state);
      return {
        success: false,
        error: {
          message: 'Failed to schedule the job!',
          statusCode: constants.statusCodes.ise,
        },
      };
    }
    return {
      success: 'false',
    };
  }
}

//-------------------------------------
async function setState(accountId, domainName, state) {
  try {
    const stateCode = state.code;
    let validCurrentState = [];
    switch (stateCode) {
      case 'destroyed':
      case 'destroy_failed':
        validCurrentState = ['destroying'];
        break;
      case 'deployed':
      case 'deploy_failed':
        validCurrentState = ['deploying'];
        break;
      case 'destroying':
        validCurrentState = [null, 'deployed', 'destroy_failed', 'deploy_failed'];
        break;
      case 'deploying':
        validCurrentState = [
          null,
          'created',
          'deployed',
          'destroyed',
          'destroy_failed',
          'deploy_failed',
        ];
        break;
    }

    const filter = {
      accountId,
      domainName,
      'state.code': { $in: validCurrentState },
    };
    const domain = await DomainModel.findOneAndUpdate(
      filter,
      { $set: { 'state.code': state.code, 'state.job': state.job ? state.job : '$state.job' } },
      { new: true },
    ).exec();

    if (domain == null) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
        },
      };
    }
    return {
      success: true,
    };
  } catch (err) {
    logger.error(err);
    return {
      success: false,
      error: {
        message: err.message,
      },
    };
  }
}

//-------------------------------------
async function updateDomain(accountId, domainName) {
  try {
    const filter = { accountId, domainName, 'state.code': 'deployed', createCertificate: false };
    await DomainModel.findOneAndUpdate(
      filter,
      { $set: { createCertificate: true } },
      { new: true },
    ).exec();

    return {
      success: true,
    };
  } catch (err) {
    logger.error(err);
    return {
      success: false,
      error: {
        message: err.message,
      },
    };
  }
}
//--------------------------------------------------------
async function getDomainResources(accountId, domainName, fields) {
  
  AWS.config.update({
    region: config.utopiopsProviderRegion,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  });

  const s3 = new AWS.S3({
    apiVersion: awsApiVersions.s3
  });
  
  try {
    const params = {
      Bucket: config.utopiopsProviderBucket,
      Key: `utopiops-water/utopiops-applications/domain/account/${accountId}/domain/${domainName}`
    };
    const resp = await s3.getObject(params).promise();
    const state = JSON.parse(resp.Body.toString());
    console.log(JSON.stringify(state));

    // const fields = req.query.fields //Sending response based on fields query
    if (fields === "[*]") {
      return {
        success: true,
        outputs: state
      };
    }
		else if (fields === '[ns]') {
			return {
				success: true,
				outputs: state.outputs.name_servers.value
			}
		}
    else if (fields === '[cert]') {
			return {
				success: true,
				outputs: state.outputs.certificate_arn.value
			}
		}
    return {
      success: true,
      outputs: state.outputs
    };
  } catch (err) {
    console.log(`error: ${err.message} - ${err.code}`);
    if (err.code === "NoSuchKey") {
      return {
				success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
			};
    }
    return {
      success: false
    }
  }
}
