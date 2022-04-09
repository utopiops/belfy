const http = require('../../shared/http.service');
const config = require('../../config');
const AuthTokenHelper = require('../../shared/authToken.helper');
const HttpHelper = require('../../shared/http.helper');

class LogmetricService {
    async getProvider(providerId, user) {

        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            const result = await httpHelper
                .withAuth(token)
                .get(`${config.apiUrl}/v2/logmetric?providerIds=["${providerId}"]&accountId=${user.accountId}&userId=${user.id}`);
                // TODO: Check if the result is empty array (sign of error?! I think so)
            return result.data.data[0]; // First .data is because of axios, second .data is because of the core API
        } catch (error) {
            console.log(`error: ${error.body || error.message || error._body}`);
            throw error; // TODO: Handle the error here or just simply remove the try-catch block
        }
    }
    
    async sendEnvironmentAlarmDeploymentResult(user, environmentName, alarmName, jobResult) {

        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            await httpHelper
                .withAuth(token)
                .post(`${config.apiUrl}/v2/logmetric/alarm/environment/name/${environmentName}/name/${alarmName}/deploy?accountId=${user.accountId}&userId=${user.id}`, jobResult);
        } catch (error) {
            console.log(`error: ${error.body || error.message || error._body}`);
            throw error; // TODO: Handle the error here or just simply remove the try-catch block
        }
    }
    
    async sendApplicationAlarmDeploymentResult(user, environmentName, applicationName, alarmName, jobResult) {

        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            await httpHelper
                .withAuth(token)
                .post(`${config.apiUrl}/v2/logmetric/alarm/environment/name/${environmentName}/application/name/${applicationName}/name/${alarmName}/deploy?accountId=${user.accountId}&userId=${user.id}`, jobResult);
        } catch (error) {
            console.log(`error: ${error.body || error.message || error._body}`);
            throw error; // TODO: Handle the error here or just simply remove the try-catch block
        }
    }
    
    async sendEnvironmentAlarmDestroyResult(user, environmentName, alarmName, jobResult) {

        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            await httpHelper
                .withAuth(token)
                .post(`${config.apiUrl}/v2/logmetric/alarm/environment/name/${environmentName}/name/${alarmName}/destroy?accountId=${user.accountId}&userId=${user.id}`, jobResult);
        } catch (error) {
            console.log(`error: ${error.body || error.message || error._body}`);
            throw error; // TODO: Handle the error here or just simply remove the try-catch block
        }
    }
    
    async sendApplicationAlarmDestroyResult(user, environmentName, applicationName, alarmName, jobResult) {

        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            await httpHelper
                .withAuth(token)
                .post(`${config.apiUrl}/v2/logmetric/alarm/environment/name/${environmentName}/application/name/${applicationName}/name/${alarmName}/destroy?accountId=${user.accountId}&userId=${user.id}`, jobResult);
        } catch (error) {
            console.log(`error: ${error.body || error.message || error._body}`);
            throw error; // TODO: Handle the error here or just simply remove the try-catch block
        }
    }

  async setApplicationAlarmState(user, environmentName, applicationName, alarmName, statusCode, jobId) {
    try {
      const token = await AuthTokenHelper.getToken();
      const httpHelper = new HttpHelper();
      const result = await httpHelper
        .withAuth(token)
        .post(`${config.apiUrl}/v3/logmetric/alarm/environment/name/${environmentName}/application/name/${applicationName}/alarm/name/${alarmName}/setState?accountId=${user.accountId}&userId=${user.id}`, { code: statusCode, job: jobId });
      return result.data;
      } catch (error) {
      console.log(`error: ${error.body || error.message || error._body}`);
      throw error; // TODO: Handle the error here or just simply remove the try-catch block
    }
  }

  async setEnvironmentAlarmState(user, environmentName, alarmName, statusCode, jobId) {
    try {
      const token = await AuthTokenHelper.getToken();
      const httpHelper = new HttpHelper();
      const result = await httpHelper
        .withAuth(token)
        .post(`${config.apiUrl}/v3/logmetric/alarm/environment/name/${environmentName}/alarm/name/${alarmName}/setState?accountId=${user.accountId}&userId=${user.id}`, { code: statusCode, job: jobId });
      return result.data;
      } catch (error) {
      console.log(`error: ${error.body || error.message || error._body}`);
      throw error; // TODO: Handle the error here or just simply remove the try-catch block
    }
  }
}


module.exports = LogmetricService;