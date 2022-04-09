const AuthTokenHelper = require('../../shared/authToken.helper');
const config          = require('../../config');
const HttpHelper      = require('../../shared/http.helper');

class JobLogStreamService {
  constructor(params) {
      
  }
  sendLog = async (user, log, jobId) => {
    try {
      const token = await AuthTokenHelper.getToken();
      const httpHelper = new HttpHelper();
      const result = await httpHelper
          .withAuth(token)
          .post(`${config.logstreamManagerUrl}/log/job`, log);
    } catch (error) {
        console.log(`error: ${error.body || error.message || error._body}`);
    }
  }
}
module.exports = JobLogStreamService;
