const AWS = require("aws-sdk");
const awsApiVersions = require("../../../../utils/awsApiVersions");

function getRds(baseConfig) {
  updateConfig(baseConfig);
  return new AWS.RDS({
    apiVersion: awsApiVersions.rds,
  });
}

function updateConfig(baseConfig) {
  AWS.config.update({
    region: baseConfig.region,
    accessKeyId: baseConfig.credentials.accessKeyId,
    secretAccessKey: baseConfig.credentials.secretAccessKey,
  });
}

exports.getRds = getRds;
