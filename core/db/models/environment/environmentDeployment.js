const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const Schema = mongoose.Schema;
const timeService = require('../../../services/time.service');
const uuid = require('uuid/v4');

const modelName = 'environment_deployment'
const EnvironmentDeploymentSchema = new Schema({
  identifier: { // This is used as the id everywhere, we don't expose _id
    type: String,
    required: true,
    default: uuid
  },
  environmentName: String, // Instead of these three I could use applicationId but then I had to join tables
  accountId: String,
  version: Number,
  action: String,
  jobId: String,
  state: String,
  deployer: String,
  isDeleted: {
    type: Boolean, 
    default: false
  }
}, { toJSON: { virtuals: true } , timestamps: true });

EnvironmentDeploymentSchema.index({ accountId: 1, environmentName: 1, version: 1, jobId: 1 }, { unique: true });

EnvironmentDeploymentSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: 'jobId',
  justOne: true
});

module.exports = mongoose.model(modelName, EnvironmentDeploymentSchema);
