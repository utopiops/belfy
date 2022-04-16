const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const Schema = mongoose.Schema;
const timeService = require('../../../services/time.service');
const uuid = require('uuid/v4');

const modelName = 'application_deployment';
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
  action: String,
  jobId: String,
  state: String,
  deployer: String,
  externalDeployer: String,
  commitId: String,
  pipelineId: String,
  pipelineJobId: String,
  pipelineLink: String,
  releaseTag: String,
  releaseNotes: String,
  variables: Object,
  isDeleted: {
    type: Boolean, 
    default: false
  }
}, { toJSON: { virtuals: true } , timestamps: true });

ApplicationDeploymentSchema.index({ accountId: 1, environmentName: 1, applicationName: 1, version: 1, jobId: 1 }, { unique: true });

ApplicationDeploymentSchema.virtual('job', {
  ref: 'Job',
  localField: 'jobId',
  foreignField: 'jobId',
  justOne: true
});

module.exports = mongoose.model(modelName, ApplicationDeploymentSchema);
