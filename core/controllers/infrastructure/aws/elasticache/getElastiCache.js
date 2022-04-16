const AWS = require("aws-sdk");
const awsApiVersions = require("../../../../utils/awsApiVersions");

function getElastiCache(baseConfig) {
  updateConfig(baseConfig);
  return new AWS.ElastiCache({
    apiVersion: awsApiVersions.elasticache,
  });
}

function updateConfig(baseConfig) {
  AWS.config.update({
    region: baseConfig.region,
    accessKeyId: baseConfig.credentials.accessKeyId,
    secretAccessKey: baseConfig.credentials.secretAccessKey,
  });
}

exports.getElastiCache = getElastiCache;
