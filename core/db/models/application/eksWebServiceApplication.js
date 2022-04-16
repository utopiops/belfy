const { Schema } = require('mongoose');
const ApplicationVersion = require('./applicationVersion');
const constants = require('../../../utils/constants');

const eksApplicationDetailsSchema = new Schema({
  eks_cluster_name: {
    type: String,
    required: true
  },
  repositoryUrl: {
    type: String,
    required: true
  },
  port: {
    type: Number,
    required: true
  },
  cpu: {
    type: Number,
    required: true
  },
  memory: {
    type: Number,
    required: true
  },
  health_check_path: {
    type: String,
    default: '/health',
  },
  integrationName: {
    type: String
  },
  branch: {
    type: String,
    required: true
  },
  jobName: {
    type: String,
  },
  environmentVariables: {
    default: [],
    type: [
      {
        _id: false,
        name: {
          type: String,
          required: true
        },
        value: {
          type: String,
          required: true
        }
      }
    ]
  },
}, { toJSON: { virtuals: true } });

module.exports = ApplicationVersion.discriminator(constants.applicationKinds.eksWebService + '_v3', eksApplicationDetailsSchema, constants.applicationKinds.eksWebService);