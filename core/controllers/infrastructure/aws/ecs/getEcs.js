const AWS = require("aws-sdk");
const awsApiVersions = require("../../../../utils/awsApiVersions");


function getEcs(baseConfig) {
  updateConfig(baseConfig);
  return new AWS.ECS({
    apiVersion: awsApiVersions.ecs,
  });
}

function updateConfig(baseConfig) {
  AWS.config.update({
    region: baseConfig.region,
    accessKeyId: baseConfig.credentials.accessKeyId,
    secretAccessKey: baseConfig.credentials.secretAccessKey,
  });
}

exports.getEcs = getEcs;
