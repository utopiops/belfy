const http = require('../../shared/http.service');
const config = require('../../config');
const AuthTokenHelper = require('../../shared/authToken.helper');
const HttpHelper = require('../../shared/http.helper');

const sslTlsCertificateService =  {
    sendCertificateDeploymentState,
    sendCertificateV2DeploymentState
}
    
async function sendCertificateDeploymentState (user, environmentName, certificateIdentifier, stateCode, jobId) {
    try {
        const token = await AuthTokenHelper.getToken();
        const httpHelper = new HttpHelper();
        await httpHelper
            .withAuth(token)
            .patch(`${config.apiUrl}/ssl_tls/environment/name/${environmentName}/certificate/identifier/${certificateIdentifier}/state?accountId=${user.accountId}&userId=${user.id}`, { code: stateCode, job: jobId });
    } catch (error) {
        console.log(`error: ${error.body || error.message || error._body}`);
        throw error; // TODO: Handle the error here or just simply remove the try-catch block
    }
}

async function sendCertificateV2DeploymentState (user, environmentName, certificateIdentifier, stateCode, jobId) {
    try {
        const token = await AuthTokenHelper.getToken();
        const httpHelper = new HttpHelper();
        await httpHelper
            .withAuth(token)
            .patch(`${config.apiUrl}/v2/ssl_tls/environment/name/${environmentName}/certificate/identifier/${certificateIdentifier}/state?accountId=${user.accountId}&userId=${user.id}`, { code: stateCode, job: jobId });
    } catch (error) {
        console.log(`error: ${error.body || error.message || error._body}`);
        throw error; // TODO: Handle the error here or just simply remove the try-catch block
    }
}
    
    

module.exports = sslTlsCertificateService;