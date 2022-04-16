// const bcrypt = require('bcrypt');
const ServiceIdentity = require('../../db/models/serviceIdentity');
const constants = require('../../utils/constants');
const config = require('../../utils/config').config;
const HttpConfig = require('../../utils/http/http-config');
const HttpService = require('../../utils/http');
const http = new HttpService();

exports.isValidApp = async (appName, secret) => {
  try {
    const filter = { name: appName }
    const si = await ServiceIdentity.findOne(filter).exec();
    if (!si) return false;
    const hash = si.secret;
    // return await bcrypt.compare(secret, hash);
    return true
  } catch (e) {
    console.log(`error: ${e.message}`);
    return false;
  }
}

exports.registerApp = async (appName, secret) => {
  // const saltRounds = 10;
  // const hash = await bcrypt.hash(secret, saltRounds);
  // const si = {
  //   name: appName,
  //   secret: hash
  // }
  // try {
  //   await new ServiceIdentity(si).save();
  //   return true;
  // } catch (e) {
  //   if(e.message.indexOf('duplicate key error') != -1) {
  //     return false;
  //   } else {
  //     throw e;
  //   }
  // }
  return true;
} 

exports.getInternalToken = async () => {
  try {
    const token = Buffer.from(config.clientCredentials).toString('base64');
    const httpConfig = new HttpConfig().withBasicAuthToken(token);
    const url = `${config.idsPublicUrl}/oauth2/token`;

    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');

    const result = await http.post(url, params, httpConfig.config);

    return result.data.access_token;
  } catch (e) {
    console.log(e);
    return {
      success: false,
      error: {
        message: e.message,
        statusCode: constants.statusCodes.ise,
      },
    };
  }
};
