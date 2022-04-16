const AWS = require('aws-sdk');

const tokenService = require('../../../../utils/auth/tokenService');
const constants = require('../../../../utils/constants');
const configHandler = require('../../../../utils/config');

const config = new configHandler();

exports.callAwsSdk = async (accountId, identifier, methodName, handleError, handleData, params = {}) => {

  const credentials = await config.getAccountCredentials(accountId, constants.applicationProviders.aws);
  
  if (!credentials) { // This indicates that the credentials are not set
    handleError(400);
    return;
  }
  const baseConfig = {
    //todo: set the region!!!
      credentials
  }

  const sdkApi = getService(identifier, baseConfig);

  sdkApi[methodName](params, (err, data) => {
      if (err) {
          handleError(err.statusCode);
      } else {
          handleData(data);
      }
  })
}

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