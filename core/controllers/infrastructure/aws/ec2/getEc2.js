const AWS = require("aws-sdk");

function getEc2(baseConfig) {
  updateConfig(baseConfig);
  return new AWS.EC2({
    apiVersion: "2016-11-15",
  });
}

function updateConfig(baseConfig) {
  AWS.config.update({
    region: baseConfig.region,
    accessKeyId: baseConfig.credentials.accessKeyId,
    secretAccessKey: baseConfig.credentials.secretAccessKey,
  });
}

exports.getEc2 = getEc2;
