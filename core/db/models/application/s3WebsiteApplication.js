const { Schema } = require("mongoose");
const ApplicationVersion = require("./applicationVersion");
const constants = require("../../../utils/constants");
const s3WebsiteApplicationSchema = new Schema(
  {
    index_document: {
      type: String,
      default: "index.html",
    },
    error_document: {
      type: String,
      default: "error.html",
    },
    acm_certificate_arn: {
      type: String,
      default: "",
    },
    redirect_acm_certificate_arn: {
      type: String,
      default: "",
    },
    app_name: {
      type: String,
    },
    release_version: {
      type: String,
      default: "",
    },
    redirect_to_www: {
      type: Boolean,
      default: false,
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
  constants.applicationKinds.s3Website + "_v3",
  s3WebsiteApplicationSchema,
  constants.applicationKinds.s3Website
);
