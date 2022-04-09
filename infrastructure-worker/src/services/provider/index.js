const config = require('../../config');
const AuthTokenHelper = require('../../shared/authToken.helper');
const HttpHelper = require('../../shared/http.helper');

class ProviderService {
    async getSummery(providerName, user) {

        try {
            const token = await AuthTokenHelper.getToken();
            const httpHelper = new HttpHelper();
            const result = await httpHelper
                .withAuth(token)
                .get(`${config.apiUrl}/account/config/provider?name=${providerName}&accountId=${user.accountId}&userId=${user.id}`);
                // TODO: Check if the result is empty array (sign of error?! I think so)
            return result.data[0];
        } catch (error) {
            console.log(`error: ${error.message}`);
            throw error; // TODO: Handle the error here or just simply remove the try-catch block
        }
    }
}

module.exports = ProviderService;