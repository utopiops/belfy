const http = require('../../shared/http.service');
const config = require('../../config');
const AuthTokenHelper = require('../../shared/authToken.helper');
const HttpHelper = require('../../shared/http.helper');

class EcrService {

    async setEcrState(user, environmentName, ecrName, statusCode, jobId) {
        try {
        const token = await AuthTokenHelper.getToken();
        const httpHelper = new HttpHelper();
        const result = await httpHelper
            .withAuth(token)
            .post(`${config.apiUrl}/elasticache/redis/environment/name/${environmentName}/ecr/name/${ecrName}/setState?accountId=${user.accountId}&userId=${user.id}`, { code: statusCode, job: jobId });
        return result.data;
        } catch (error) {
        console.log(`error: ${error.body || error.message || error._body}`);
        throw error; // TODO: Handle the error here or just simply remove the try-catch block
        }
    }
}


module.exports = EcrService;