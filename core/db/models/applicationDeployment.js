const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const Schema = mongoose.Schema;
const constants = require('../../utils/constants');
const timeService = require('../../services/time.service');
const uuid = require('uuid/v4');

const modelName = 'application_deployment_old';
const ApplicationDeploymentSchema = new Schema({
  identifier: { // This is used as the id everywhere, we don't expose _id
    type: String,
    required: true,
    default: uuid
  },
  environmentName: String, // Instead of these three I could use applicationId but then I had to join tables
  applicationName: String,
  accountId: String,
  version: Number,
  jobId: String,
  deployer: {
    type: ObjectId,
    ref: 'User'
  },
  externalDeployer: String,
  commitId: String,
  pipelineId: String,
  pipelineJobId: String,
  pipelineLink: String,
  releaseTag: String,
  releaseNotes: String,
  variables: Object
}, { toJSON: { virtuals: true }, timestamps: true });

ApplicationDeploymentSchema.index({ accountId: 1, environmentName: 1, applicationName: 1, version: 1, jobId: 1 }, { unique: true });

ApplicationDeploymentSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: 'jobId',
  justOne: true
});


ApplicationDeploymentSchema.statics.add = add;
ApplicationDeploymentSchema.statics.list = list;
ApplicationDeploymentSchema.statics.listByDate = listByDate;
ApplicationDeploymentSchema.statics.getApplicationLatestDeployment = getApplicationLatestDeployment;

async function add(deployment) {
  try {
    const doc = new this(deployment);
    await doc.save();
    return {
      success: true
    };
  } catch (err) {
    console.log(`error:`, err.message);
    let message = err.message;
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}

async function list(accountId, environmentName, applicationName) {
  try {
    const filter = {
      accountId,
      ...(environmentName ? {environmentName} : {}),
      ...(applicationName ? {applicationName} : {})
      }
    const docs = await this.find(filter, { _id: 0, __v: 0 })
      .populate('job', 'startTime lastUpdated status')
      .populate('deployer', 'username')
      .exec();
    console.log(docs);
    if (docs == null || docs.length == 0) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true,
      output: {
        deployments: docs
      }
    };
  } catch (err) {
    console.log(`error`, err);
    let message = err.message;
    return {
      success: false,
      message: message
    };
  }
}

async function listByDate(accountId) {
  try {
    const query = [
      {
        $match: {
          accountId: accountId,
          "createdAt": {
            $exists: true
          }
        }
      },
      {
        $project: {
          _id: 0,
          createdAt: 1,
          environmentName: 1,
          applicationName: 1
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              date: "$createdAt"
            }
          },
          value: {
            $sum: 1
          }
        }
      },
      {
        $project: {
          "day": "$_id",
          "value": 1,
          "_id": 0
        }
      }
    ];
    const docs = await this.aggregate(query);

    if (docs == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }

    return {
      success: true,
      output: {
        deployments: docs
      }
    };
  } catch (err) {
    console.log(`error`, err);
    let message = err.message;
    return {
      success: false,
      message: message
    };
  }
}
//---------------------------------
async function getApplicationLatestDeployment(accountId, environmentName, applicationName) {
  try {
    const filter = { accountId, environmentName, applicationName };
    const docs = await this.findOne(filter, { _id: 0, __v: 0 })
      .sort({ _id: -1 })
      .populate('job', 'startTime lastUpdated status')
      .populate('deployer', 'username')
      .exec();
    if (docs == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true,
      output: {
        deployments: docs
      }
    };
  } catch (err) {
    console.log(`error`, err);
    let message = err.message;
    return {
      success: false,
      message: message
    };
  }
}


module.exports = mongoose.model(modelName, ApplicationDeploymentSchema);
