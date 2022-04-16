const { Schema } = require("mongoose");
const UtopiopsApplication = require('./utopiopsApplication');
const constants = require("../../../utils/constants");

const staticWebsiteApplicationSchema = new Schema(
  {
    repositoryUrl: {
      type: String,
      required: true,
    },
    integrationName: {
      type: String
    },
    index_document: {
      type: String,
      default: "index.html"
    },
    error_document: {
      type: String,
      default: "error.html"
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
    branch: {
      type: String,
      required: true
    },
  }
);

module.exports = UtopiopsApplication.discriminator(
  constants.applicationKinds.staticWebsite,
  staticWebsiteApplicationSchema
);
