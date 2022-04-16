const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const constants = require('../../../utils/constants');
const { runQueryHelper } = require('../helpers');
const EcrModel = require('./elasticacheRedis');
const EcrVersionModel = require('./elasticacheRedisVersion');
const EnvironmentModel = require('../environment/environment')
const timeService = require('../../../services/time.service');
const { config } = require('../../../utils/config');
const queueService = require('../../../queue');
const AWS = require('aws-sdk');
const awsApiVersions = require('../../../utils/awsApiVersions');
const HttpConfig = require('../../../utils/http/http-config');
const Job = require('../job');
const job = new Job();
const { defaultLogger: logger } = require('../../../logger');

module.exports = {
  createECR,
  addECRVersion,
  updateECRVersion,
  listEnvironmentECRs,
  listEnvironmentECRVersions,
  getEcrSummary,
  getECRDetails,
  getEcrResources,
  listAccountECRs,
  activate,
  tfActionECR,
  getForTf,
  setState,
  deleteECR,
};
//---------------------------------------------------------
async function createECR(environmentId, ecrVersion) {
  let step = 0;
  let ecrVersionId;
  try {
    const newECR = {
      environment: environmentId,
      display_name: ecrVersion.display_name,
    };
    const ecr = new EcrModel(newECR);
    await ecr.save();
    step++;

    ecrVersion.elasticache = ecr._id;

    const doc = new EcrVersionModel(ecrVersion);
    await doc.save();
    step++;

    ecrVersionId = doc._id;

    const filter = { _id: ecr._id };
    const update = {
      $push: {
        versions: ecrVersionId,
      },
    };
    const updated = EcrModel.findOneAndUpdate(filter, update, { new: true }).exec();
    if (updated == null) {
      return {
        error: {
          message: 'Failed to update',
          statusCode: constants.statusCodes.ise,
        },
      };
    }
    return {
      success: true,
      outputs: { version: doc.version }
    };
  } catch (err) {
    logger.error(`error: ${err.message},  rolling back`);
    try {
      if (step > 1) {
        // rollback the second part (ecr version insert)
        await EcrVersionModel.findOneAndDelete({ _id: ecrVersionId }).exec();
      }
      if (step > 0) {
        // rollback the first part (ecr insert)
        await EcrModel.findOneAndDelete({
          environment: environmentId,
          display_name: ecrVersion.display_name,
        }).exec();
      }
    } catch (e) {
      // TODO: do something about it. if we go inside this, we'll have data inconsistency
      logger.error(`failed to rollback adding the ecr ${ecrVersion.name}`);
      let message = err.message;
      return {
        success: false,
        error: {
          message,
        },
      };
    }
    let message = err.message;
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      error: {
        message,
        statusCode: constants.statusCodes.badRequest,
      },
    };
  }
}
//---------------------------------------------------------
async function addECRVersion(environmentId, ecrVersion) {
  let step = 0;
  let ecrVersionId;
  try {
    // Check if the ecr exists (get it's _id)
    const filter = {
      environment: environmentId,
      display_name: ecrVersion.display_name,
    };
    const ecr = await EcrModel.findOne(filter, { _id: 1 }).exec();
    if (ecr == null) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.notFound,
        },
      };
    }
    // check if the the base version exist
    const ecrVersionFilter = {
      elasticache: ecr._id,
      version: ecrVersion.fromVersion,
    };
    const baseVersion = await EcrVersionModel.findOne(ecrVersionFilter, { _id: 1 }).exec();
    if (baseVersion == null) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.notFound,
        },
      };
    }
    // Find the biggest version
    const maxFilter = {
      elasticache: ecr._id,
    };
    const max = await EcrVersionModel.findOne(maxFilter, { version: 1 }).sort('-version').exec();
    if (max == null) {
      return {
        success: false,
      };
    }

    // Increase the version by 1 and add the new ecr version
    ecrVersion.elasticache = ecr._id;
    ecrVersion.version = max.version + 1;

    const doc = new EcrVersionModel(ecrVersion);
    await doc.save();
    step++;

    ecrVersionId = doc._id;

    // Push the new version to the elasticache versions
    const update = {
      $push: {
        versions: ecrVersionId,
      },
    };
    const updated = EcrModel.findOneAndUpdate({ _id: ecr._id }, update, {
      new: true,
    }).exec();
    if (updated == null) {
      return {
        error: {
          message: 'Failed to update',
        },
      };
    }
    return {
      success: true,
      outputs: { version: doc.version }
    };
  } catch (err) {
    logger.error(`error: ${err.message}`);
    try {
      if (step > 1) {
        // rollback the ecr version insert
        await EcrVersionModel.findOneAndDelete({ _id: ecrVersionId }).exec();
      }
    } catch (e) {
      let message = err.message;
      return {
        success: false,
        error: {
          message,
        },
      };
    }
    let message = err.message;
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate; // This might happen if two people add new version at the very same time and the new version becomes equal for both!!!
    }
    return {
      success: false,
      error: {
        message,
        statusCode: constants.statusCodes.badRequest,
      },
    };
  }
}
//---------------------------------------------------------
async function updateECRVersion(environmentId, ecrVersion) {
  const runQuery = async () => {
    const filter = {
      environment: environmentId,
      display_name: ecrVersion.display_name,
    };
    const ecr = await EcrModel.findOne(filter, { _id: 1 }).exec();

    if (!ecr)
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.notFound,
        },
      };

    delete ecrVersion.display_name;
    const ecrVersionFilter = {
      elasticache: ecr._id,
      version: ecrVersion.version,
      isActivated: false,
    };

    return await EcrVersionModel.findOneAndUpdate(ecrVersionFilter, ecrVersion, {
      new: true,
    }).exec();
  };

  const extractOutput = (outputs) => {
    return {
      version: outputs.version
    }
  }

  return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function listEnvironmentECRs(environmentId) {
  const runQuery = async () => {
    const filter = { environment: { $in: environmentId } };
    return await EcrModel.find(filter, { display_name: 1, kind: 1, activeVersion: 1, state: 1 })
      .populate('environment', 'name')
      .exec();
  };
  const extractOutput = (result) => [
    ...result.map((ecr) => ({
      state: ecr.state,
      display_name: ecr.display_name,
      activeVersion: ecr.activeVersion,
      environmentName: ecr.environment.name,
    })),
  ];
  return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function listEnvironmentECRVersions(environmentId, ecrName) {
  const runQuery = async () => {
    const filter = { environment: environmentId, display_name: ecrName };
    return await EcrModel.findOne(filter, { _id: 1 })
      .populate('versions', 'version fromVersion createdAt isActivated')
      .exec();
  };

  const extractOutput = (result) => [
    ...result.versions.map((ecr) => ({
      version: ecr.version,
      fromVersion: ecr.fromVersion,
      createdAt: ecr.createdAt,
      isActivated: ecr.isActivated,
    })),
  ];

  return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function getECRDetails(environmentId, ecrName, version) {
  const runQuery = async () => {
    const filter = { environment: environmentId, display_name: ecrName };
    const ecr = await EcrModel.findOne(filter, { _id: 1, name: 1, state: 1 })
      .populate({
        path: 'versions',
        select: 'version',
        match: { version },
      })
      .exec();
    if (ecr == null || ecr.versions.length === 0) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.notFound,
        },
      };
    }
    const ecrVersion = await EcrVersionModel.findOne(
      { _id: ecr.versions[0]._id },
      { _id: 0, __v: 0, ecrPassword: 0 },
    )
      .populate('createdBy', 'username -_id')
      .exec();
    if (ecrVersion == null) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.notFound,
        },
      };
    }
    return {
      ...ecrVersion.toObject(),
      display_name: ecr.display_name,
      state: ecr.state,
    };
  };

  const extractOutput = (result) => result;

  return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function listAccountECRs(accountId) {
  const runQuery = async () => {
    return await EcrModel.aggregate([
      {
        $lookup: {
          from: 'environment_v2',
          localField: 'environment',
          foreignField: '_id',
          as: 'ecr_with_env',
        },
      },
      {
        $match: {
          'ecr_with_env.accountId': ObjectId(accountId),
        },
      },
      {
        $unwind: '$ecr_with_env',
      },
      {
        $project: {
          _id: 1,
          state: 1,
          display_name: 1,
          activeVersion: 1,
          deployedVersion: 1,
          environmentName: '$ecr_with_env.name',
        },
      },
    ]);
  };
  const extractOutput = (result) => [
    ...result.map((ecr) => ({
      id: ecr._id,
      state: ecr.state,
      display_name: ecr.display_name,
      activeVersion: ecr.activeVersion,
      environmentName: ecr.environmentName,
    })),
  ];
  return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function activate(userId, environmentId, ecrName, version) {
  const runQuery = async () => {
    const filter = {
      environment: new ObjectId(environmentId),
      display_name: ecrName,
      activeVersion: { $ne: version },
    };
    const doc = await EcrModel.findOne(filter).populate('versions', 'version').exec();

    if (doc == null || !doc.populated('versions')) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.notFound,
        },
      };
    }

    const exists = doc.versions.findIndex((v) => v.version === version) !== -1;
    if (!exists) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.notFound,
        },
      };
    }

    // Now that it exists, update it
    const update = {
      activeVersion: version,
    };
    const updated = await EcrModel.findByIdAndUpdate(doc._id, update, {
      new: true,
    }).exec();
    if (!updated) {
      return {
        error: {
          message: 'Failed to update environment ecr',
          statusCode: constants.statusCodes.ise,
        },
      };
    }
    // Update the status of the ecr version
    const ecrVersionFilter = { elasticache: doc._id, version };
    const ecrVersionUpdate = { isActivated: true };
    const updateEcrVersion = await EcrVersionModel.findOneAndUpdate(
      ecrVersionFilter,
      ecrVersionUpdate,
      {
        new: true,
      },
    ).exec();
    if (updateEcrVersion == null) {
      return {
        error: {
          message: 'Failed to update environment ecr',
          statusCode: constants.statusCodes.ise,
        },
      };
    }
    return updateEcrVersion;
  };

  return await runQueryHelper(runQuery);
}
//-----------------------------
async function tfActionECR(action, req, res) {
  const accountId = res.locals.accountId;
  const userId = res.locals.userId;
  const environmentName = req.params.environmentName;
  const ecrName = req.params.ecrName;

  const { accessKeyId, secretAccessKey, version } = req.body;

  const environmentId = res.locals.environmentId;

  if(action == 'deploy') {
    const environment = await EnvironmentModel.findOne({ _id: environmentId, 'state.code': 'deployed' })
    if(!environment) {
      return {
        error: {
          statusCode: constants.statusCodes.notAllowed,
          message: 'The intended environment must be deployed to be able to deploy the ECR'
        }
      }
    }
  }

  const jobPaths = {
    dryRun: constants.jobPaths.dryRunElasticacheRedis,
    deploy: constants.jobPaths.deployElasticacheRedis,
    destroy: constants.jobPaths.destroyElasticacheRedis,
  };

  const jobPath = jobPaths[action];

  const ecr = await EcrModel.findOne(
    { environment: environmentId, display_name: ecrName },
    { _id: 0, __v: 0, versions: 0 },
  );
  if (!ecr) {
    return {
      success: false,
      error: {
        message: constants.errorMessages.models.elementNotFound,
        statusCode: constants.statusCodes.badRequest,
      },
    };
  }

  // If the action is deploy or destroy, ignore the version and just use activeVersion and deployedVersion
  // If the action is dry-run, use the version sent by user, if not provided just use the activeVersion
  const ecrVersionNumber =
    action === 'destroy'
      ? ecr.deployedVersion
      : action === 'deploy' || !version
      ? ecr.activeVersion
      : version;
  const ecrVersion = await getForTf(environmentId, ecrName, ecrVersionNumber);

  if (!ecrVersion.success) {
    return {
      success: false,
      error: {
        message: constants.errorMessages.models.elementNotFound,
        statusCode: constants.statusCodes.badRequest,
      },
    };
  }

  logger.verbose(JSON.stringify(ecrVersion.outputs, null, 2));

  const message = {
    jobPath,
    jobDetails: {
      userId,
      accountId,
      details: {
        environmentName,
        providerDetails: res.locals.provider.backend,
        credentials: {
          accessKeyId: accessKeyId || res.locals.credentials.accessKeyId,
          secretAccessKey: secretAccessKey || res.locals.credentials.secretAccessKey,
        },
        ...ecr.toObject(),
        ...ecrVersion.outputs,
      },
    },
  };
  const options = {
    userId: message.jobDetails.userId,
    accountId: message.jobDetails.accountId,
    path: message.jobPath,
    jobDataBag: {
      environmentName,
      ecrName,
      version: action === 'destroy' ? ecr.deployedVersion : ecrVersionNumber,
    },
  };
  try {
    if (action === 'deploy' || action === 'destroy') {
      // First we try to set the state code only to see if we can send the job or not
      const stateCode = {
        code: action === 'deploy' ? 'deploying' : 'destroying',
      };
      const setStateCodeResult = await setState(environmentId, ecrName, stateCode);

      if (!setStateCodeResult.success) {
        return {
          success: false,
          error: {
            message: constants.errorMessages.models.elementNotFound,
            statusCode: constants.statusCodes.notFound,
          },
        };
      }
    }
    const jobId = await queueService.sendMessage(config.queueName, message, options);
    if (action === 'deploy') {
      await EcrModel.findOneAndUpdate(
        { environment: environmentId, display_name: ecrName },
        { deployedVersion: ecrVersionNumber },
      );
    }
    await setJobId(environmentId, ecrName, jobId);

    const jobNotification = {
      accountId: message.jobDetails.accountId,
      category: 'infw',
      dataBag: {
        jobPath: message.jobPath,
        environmentName,
        ecrName,
        status: 'created',
        jobId,
      },
    };
    const httpConfig = new HttpConfig().withCustomHeaders(res.locals.headers);
    await job.sendJobNotification(jobNotification, httpConfig);

    return {
      success: true,
      outputs: { jobId },
    };
  } catch (error) {
    logger.error(`error: ${error.message}`);
    try {
      await setState(environmentId, ecrName, { code: `${action}_failed` });
    } catch (err) {
      return {
        success: false,
      };
    }
    return {
      success: false,
      error: {
        message: error.message,
      },
    };
  }
}
//-----------------------------
async function getForTf(environmentId, ecrName, version = null) {
  const runQuery = async () => {
    let ecrFilter = { environment: environmentId, display_name: ecrName };
    if (!version) {
      // If the version is not specified we find the active version of the application
      ecrFilter.activeVersion = { $exists: true };
    }
    const doc = await EcrModel.findOne(ecrFilter)
      .populate('environment', 'region hostedZone domain')
      .exec();

    if (doc == null) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.notFound,
        },
      };
    }

    const filter = { elasticache: doc._id, version: version ? version : doc.activeVersion };

    let ecrVersion = await EcrVersionModel.findOne(filter, { _id: 0, __v: 0 }).exec();

    if (ecrVersion == null) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.notFound,
        },
      };
    }

    let result = ecrVersion.toJSON();
    result.region = doc.environment.region;
    result.hostedZone = doc.environment.hostedZone;
    result.domain = doc.environment.domain;
    result.activeVersion = doc.activeVersion;
    result.state = doc.state;
    return result;
  };

  const extractOutput = (result) => result;

  return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function setState(environmentId, ecrName, state) {
  const runQuery = async () => {
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
          'destroyed',
          'destroy_failed',
          'deploy_failed',
          'deployed',
        ];
        break;
    }
    const filter = {
      // Note: at the moment I don't match the job in the state, not sure if it makes sense to verify the same job responsible for current state is updating it
      environment: environmentId,
      display_name: ecrName,
      'state.code': { $in: validCurrentState },
    };
    return await EcrModel.findOneAndUpdate(filter, { state }, { new: true }).exec();
  };

  const extractOutput = (result) => result;

  return await runQueryHelper(runQuery, extractOutput);
}
// --------------------------------------
async function setJobId(environmentId, ecrName, jobId) {
  const filter = {
    environment: environmentId,
    display_name: ecrName,
  };
  const update = {
    $set: { 'state.job': jobId },
  };
  return await EcrModel.findOneAndUpdate(filter, update, { new: true }).exec();
}
//-----------------------------------------
async function deleteECR(userId, environmentId, ecrName) {
  const runQuery = async () => {
    // Check if such ecr exists
    const filter = { environment: new ObjectId(environmentId), display_name: ecrName };
    const doc = await EcrModel.findOne(filter).exec();

    if (doc == null) {
      return {
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.notFound,
        },
      };
    }
    // TODO: This is just the basic condition for now, has to be refined later as we use the ecr and figure out the common usage patterns
    let canDelete = false;
    if (doc.state.code === 'destroyed' || doc.state.code === 'created') {
      canDelete = true;
    }
    if (!canDelete) {
      return {
        error: {
          message: 'Cannot delete the ecr, it needs to be destroyed first',
          statusCode: constants.statusCodes.badRequest,
        },
      };
    }
    const ecrVersionFilter = { elasticache: doc._id };
    await EcrVersionModel.deleteMany(ecrVersionFilter).exec();
    await EcrModel.findByIdAndDelete(doc._id).exec();
    return {
      success: true,
    };
  };

  const extractOutput = (result) => result;

  return await runQueryHelper(runQuery, extractOutput);
}
//---------------------------------------------
async function getEcrSummary(environmentId, ecrName) {
  const runQuery = async () => {
    const filter = { environment: environmentId, display_name: ecrName };
    return await EcrModel.findOne(filter, { _id: 0, state: 1, deployedVersion: 1, activeVersion: 1 }).exec();
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------------------
async function getEcrResources(
  environmentName,
  ecrName,
  credentials,
  region,
  bucketName,
  fields,
) {
  AWS.config.update({
    region,
    accessKeyId: credentials.accessKeyId,
    secretAccessKey: credentials.secretAccessKey,
  });
  const s3 = new AWS.S3({
    apiVersion: awsApiVersions.s3,
  });

  try {
    const params = {
      Bucket: bucketName, //IMPORTANT: this object path should be kept in sync with inf-worker.
      Key: `utopiops-water/elasticache/redis/environment/${environmentName}/${ecrName}`,
    };
    const resp = await s3.getObject(params).promise();
    const state = JSON.parse(resp.Body.toString());
    logger.verbose(JSON.stringify(state));

    if (fields === '[*]') {
      //Sending response based on fields query
      return {
        success: true,
        outputs: state,
      };
    }
    if (fields == '[primary_endpoint_address]') {
      //Sending response based on fields query
      return {
        success: true,
        outputs: state.outputs.cluster.value.primary_endpoint_address,
      };
    }
    return {
      success: true,
      outputs: state.outputs,
    };
  } catch (err) {
    logger.verbose(`error: ${err.message} - ${err.code}`);
    if (err.code === 'NoSuchKey') {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound,
      };
    }
    return {
      success: false,
    };
  }
}
