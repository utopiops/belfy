const AWS = require("aws-sdk");
const awsApiVersions = require("../../utils/awsApiVersions");

function getS3(baseConfig) {
  updateConfig(baseConfig);
  return new AWS.S3({
    apiVersion: awsApiVersions.s3,
  });
}

function updateConfig(baseConfig) {
  AWS.config.update({
    region: baseConfig.region,
    accessKeyId: baseConfig.credentials.accessKeyId,
    secretAccessKey: baseConfig.credentials.secretAccessKey,
  });
}

exports.getS3 = getS3;
