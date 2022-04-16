const { Schema } = require("mongoose");
const ObjectId  = require('mongoose').Types.ObjectId;
const UtopiopsApplication = require('./utopiopsApplication');
const constants = require("../../../utils/constants");

const customDomainStaticWebsiteSchema = new Schema(
  {
    domainId: {
      type: ObjectId,
      ref: 'domain',
      required: true
    },
    repositoryUrl: {
      type: String,
      required: true,
    },
    integrationName: {
      type: String
    },
    branch: {
      type: String,
      required: true
    },
    index_document: {
      type: String,
      default: "index.html"
    },
    error_document: {
      type: String,
      default: "error.html"
    },
    redirect_to_www: {
      type: Boolean,
      default: false
    },
    domain: {
      type: String,
      required: true
    },
    buildCommand: {
      type: String
    },
    outputPath: {
      type: String,
      required: true
    },
    jobName: {
      type: String,
    },
    state: {
      type: {
        _id: false,
        code: {
          code: String
        },
        job: String
      },
      default: {
        code: 'created' // We don't provide reason for the state code ⏩created⏪
      }
    }
  }
);

module.exports = UtopiopsApplication.discriminator(
  constants.applicationKinds.customDomainStatic,
  customDomainStaticWebsiteSchema
);
