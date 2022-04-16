const constants = require('../../../../utils/constants');
const configHandler = require('../../../../utils/config');
const getService = require('./getService');

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

