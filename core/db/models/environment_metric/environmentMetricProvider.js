const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = require('mongoose').Types.ObjectId;
const timeService = require('../../../services/time.service');
const constants = require('../../../utils/constants');

const modelName = 'env_metric_provider';

const environmentMetricProvider = new Schema({
  environment: {
    type: ObjectId,
    ref: 'environment'
  },
  serviceProvider: {
    type: String,
    enum: ['cloudwatch', 'azuremonitor', 'stackdriver', 'elk', 'grafana', 'datadog', 'newrelic']
  },
  createdBy: {
    type: ObjectId,
    ref: 'User'
  },
}, { discriminatorKey: 'serviceProvider' , timestamps: true });

environmentMetricProvider.index({ environment: 1, serviceProvider: 1 }, { unique: true });


environmentMetricProvider.statics.addProviderCloudWatch = addProviderCloudWatch;
environmentMetricProvider.statics.listMetricProviders = listMetricProviders;
environmentMetricProvider.statics.deleteMetricProviders = deleteMetricProviders;

//---------------------------------------
async function addProviderCloudWatch(environmentId, userId) {
  try {
    const provider = {
      serviceProvider: 'cloudwatch',
      environment: environmentId,
      createdBy: userId,
    };
    const doc = new this(provider);
    await doc.save();
    return {
      success: true
    };
  } catch (err) {
    console.log(`error`, err);
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
//---------------------------------------
async function listMetricProviders(environmentId) {
  try {
    const filter = { environment: environmentId };
    const docs = await this.find(filter, { _id: 0, __v: 0, environment: 0 })
      .populate('createdBy', 'username').exec();
    if (docs == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true,
      output: {
        providers: docs
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
//---------------------------------------
async function deleteMetricProviders(environmentId) {
  try {
    const filter = { environment: environmentId };
    const docs = await this.deleteMany(filter).exec();
    if (docs == null || docs.deletedCount === 0) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true
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

module.exports = mongoose.model(modelName, environmentMetricProvider);
