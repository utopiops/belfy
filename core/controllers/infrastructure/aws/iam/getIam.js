const AWS = require("aws-sdk");

function getIam(baseConfig) {
  updateConfig(baseConfig);
  return new AWS.IAM({
    apiVersion: "2010-05-08",
  });
}

function updateConfig(baseConfig) {
  AWS.config.update({
    region: baseConfig.region,
    accessKeyId: baseConfig.credentials.accessKeyId,
    secretAccessKey: baseConfig.credentials.secretAccessKey,
  });
}

exports.getIam = getIam;
