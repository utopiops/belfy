const AuthTokenHelper = require('../../shared/authToken.helper');
const config = require('../../config');
const constants = require('../../shared/constants');
const HttpHelper = require('../../shared/http.helper');
const logger = require('../../shared/logger');

class JobService {
  // Updates the job status and returns true as success and false as failure
  notifyJobPicked = async (user, jobId) => {
    try {
      const token = await AuthTokenHelper.getToken();
      const httpHelper = new HttpHelper();
      await httpHelper
        .withAuth(token)
        .put(`${config.apiUrl}/job/${jobId}/status?accountId=${user.accountId}&userId=${user.id}`, { status: constants.jobStats.processing });
      return true;
    } catch (error) {
      logger.error(error);
      return false;
    }
  }
  notifyJobTimeout = async (user, jobId) => {
    try {
      const token = await AuthTokenHelper.getToken();
      const httpHelper = new HttpHelper();
      await httpHelper
        .withAuth(token)
        .put(`${config.apiUrl}/job/${jobId}/status?accountId=${user.accountId}&userId=${user.id}`, { status: constants.jobStats.timeout });
      return true;
    } catch (error) {
      logger.error(error);
      return false;
    }
  }
  notifyJobFailed = async (user, jobId) => {
    try {
      const token = await AuthTokenHelper.getToken();
      const httpHelper = new HttpHelper();
      await httpHelper
        .withAuth(token)
        .put(`${config.apiUrl}/job/${jobId}/status?accountId=${user.accountId}&userId=${user.id}`, { status: constants.jobStats.failed });
      return true;
    } catch (error) {
      logger.error(error);
      return false;
    }
  }

  // Updates the job status and returns true as success and false as failure
  notifyJobDone = async (user, jobId, jobResult = { success: true }) => {
    try {
      const token = await AuthTokenHelper.getToken();
      const httpHelper = new HttpHelper();
      await httpHelper
        .withAuth(token)
        .put(`${config.apiUrl}/job/${jobId}/status?accountId=${user.accountId}&userId=${user.id}`, { status: jobResult.success ? constants.jobStats.complete : constants.jobStats.failed });
      return true;
    } catch (error) {
      console.log(`error: ${error.body || error.message || error._body}`);
      return false;
    }
  }

}

module.exports = JobService;
