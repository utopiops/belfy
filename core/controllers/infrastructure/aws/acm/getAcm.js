const AWS = require("aws-sdk");
const awsApiVersions = require("../../../../utils/awsApiVersions");

function getAcm(baseConfig) {
  updateConfig(baseConfig);
  return new AWS.ACM({
    apiVersion: awsApiVersions.acm,
  });
}

function updateConfig(baseConfig) {
  AWS.config.update({
    region: baseConfig.region,
    accessKeyId: baseConfig.credentials.accessKeyId,
    secretAccessKey: baseConfig.credentials.secretAccessKey,
  });
}

exports.getAcm = getAcm;
