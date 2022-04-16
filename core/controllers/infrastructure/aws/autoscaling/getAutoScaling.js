const AWS = require("aws-sdk");
const awsApiVersions = require("../../../../utils/awsApiVersions");

function getAutoScaling(baseConfig) {
  updateConfig(baseConfig);
  return new AWS.AutoScaling({
    apiVersion: awsApiVersions.autoscaling,
  });
}

function updateConfig(baseConfig) {
  AWS.config.update({
    region: baseConfig.region,
    accessKeyId: baseConfig.credentials.accessKeyId,
    secretAccessKey: baseConfig.credentials.secretAccessKey,
  });
}

exports.getAutoScaling = getAutoScaling;
