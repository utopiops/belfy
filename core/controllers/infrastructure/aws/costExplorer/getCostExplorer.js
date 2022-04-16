const AWS = require("aws-sdk");
const awsApiVersions = require("../../../../utils/awsApiVersions");

function getCostExplorer(baseConfig) {
  updateConfig(baseConfig);
  return new AWS.CostExplorer({
    apiVersion: awsApiVersions.costExplorer,
  });
}

function updateConfig(baseConfig) {
  AWS.config.update({
    region: baseConfig.region,
    accessKeyId: baseConfig.credentials.accessKeyId,
    secretAccessKey: baseConfig.credentials.secretAccessKey
  });
}

exports.getCostExplorer = getCostExplorer;
