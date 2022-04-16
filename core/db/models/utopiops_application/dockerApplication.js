const { Schema } = require("mongoose");
const UtopiopsApplication = require('./utopiopsApplication');
const ObjectId  = require('mongoose').Types.ObjectId;
const constants = require("../../../utils/constants");

const dockerApplicationSchema = new Schema(
  {
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
    size: {
      type: String,
      required: true
    },
    volumePath: {
      type: String
    },
    storageCapacity: {
      type: Number
    },
    integrationName: {
      type: String
    },
    branch: {
      type: String,
      required: true
    },
    domain: {
      type: String,
      required: true
    },
    domainId: {
      type: ObjectId,
      ref: 'domain',
    },
    healthCheckPath: {
      type: String,
      default: '/health',
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
    }
  }
);


module.exports = UtopiopsApplication.discriminator(
  constants.applicationKinds.docker,
  dockerApplicationSchema
);
