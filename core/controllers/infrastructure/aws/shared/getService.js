const AWS = require('aws-sdk');
const constants = require('../../../../utils/constants');

// Private functions
const getService = (identifier, baseConfig) => {
  updateConfig(baseConfig);
  return new AWS[capitalize(identifier)]({
      apiVersion: constants.awsSdkApiVersion[identifier]
  });
}

const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function updateConfig(baseConfig) {
  AWS.config.update({
      region: baseConfig.region,
      accessKeyId: baseConfig.credentials.accessKeyId,
      secretAccessKey: baseConfig.credentials.secretAccessKey
  });
}

module.exports = getService;