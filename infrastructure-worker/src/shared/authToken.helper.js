const HttpHelper  = require('./http.helper');
const config      = require('../config');

class AuthTokenHelper {

  static token = {};

  // static register = async () => {
  //   const httpHelper = new HttpHelper();
  //     const headers = [{
  //       name: 'appName',
  //       value: config.appName
  //     },
  //     {
  //       name: 'secret',
  //       value: config.tokenSecret
  //     }];
  //     const url = `${config.apiUrl}/auth/apps/register`
  //     return await httpHelper.withHeaders(headers)
  //     .post(url, {});
  // }

  static register = async () => {
    const httpHelper = new HttpHelper();
    const token = Buffer.from(config.clientCredentials).toString('base64');
    
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    
    const url = `${config.idsPublicUrl}/oauth2/token`;
    return await httpHelper.withHeaders([{
      name: 'Authorization',
      value: `Basic ${token}`
    }]).post(url, params);
  }

  // Get a token per specific user (corresponding to the job)
  // static getToken = async (user = {}) => {
  //   let id = user.id + "_" + user.accountId;
  //   if (!AuthTokenHelper.tokens[id]) {
  //     // Get the token
  //     const httpHelper = new HttpHelper();
  //     const headers = [{
  //       name: 'appName',
  //       value: config.appName
  //     },
  //     {
  //       name: 'secret',
  //       value: config.tokenSecret
  //     }];
  //     const url = `${config.apiUrl}/auth/apps/token`
  //     const result = await httpHelper.withHeaders(headers)
  //     .post(url, {user});
  //     AuthTokenHelper.tokens[id] = result.data.token;
  //   }
  //   return AuthTokenHelper.tokens[id];
  // }

  static getToken = async () => {
    if (AuthTokenHelper.token.expiresAt) {
      const now = new Date().getTime();
      if (AuthTokenHelper.token.expiresAt - 3600000 > now) {
        return AuthTokenHelper.token.access_token;
      }
    }

    console.log('Getting new token');
    const httpHelper = new HttpHelper();
    const token = Buffer.from(config.clientCredentials).toString('base64');
  
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
  
    const url = `${config.idsPublicUrl}/oauth2/token`;
    const result = await httpHelper.withHeaders([{
      name: 'Authorization',
      value: `Basic ${token}`
    }]).post(url, params);

    AuthTokenHelper.token = result.data;
    AuthTokenHelper.token.expiresAt = new Date().getTime() + (AuthTokenHelper.token.expires_in * 1000);
  
    return AuthTokenHelper.token.access_token;
  };
}

module.exports = AuthTokenHelper;
