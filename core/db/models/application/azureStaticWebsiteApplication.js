const { Schema } = require("mongoose");
const ApplicationVersion = require("./applicationVersion");
const constants = require("../../../utils/constants");

const azureStaticWebsiteApplicationSchema = new Schema(
  {
    index_document: {
      type: String,
      default: "index.html",
    },
    error_document: {
      type: String,
      default: "error.html",
    },
    app_name: {
      type: String,
    },
    repositoryUrl: { // todo: remove repositoryUrl and integrationName from here and fix where they are used
      type: String,
    },
    integrationName: {
      type: String,
    },
    branch: {
      type: String,
      default: 'main'
    },
    buildCommand: {
      type: String
    },
    outputPath: {
      type: String,
      default: '/'
    },
    jobName: {
      type: String,
    }
  },
  { toJSON: { virtuals: true } }
);

module.exports = ApplicationVersion.discriminator(
  constants.applicationKinds.azureStaticWebsite + "_v3",
  azureStaticWebsiteApplicationSchema,
  constants.applicationKinds.azureStaticWebsite
);
