const AccessTokenService = require('../db/models/access_token/accessToken.service');

exports.getAccessTokenAccount = getAccessTokenAccount;

function getAccessTokenAccount() {
	return async (req, res, next) => {
		try {
      const { token } = req.headers;
      const result = await AccessTokenService.getAccessTokenAccount(token)
      
			if (result.error) {
				res.status(result.error.statusCode).send('Invalid access token!');
				return;
			}
			res.locals.accountId = result.outputs.accountId;
			res.locals.userId = result.outputs.userId;
			next();
		} catch (error) {
			console.error(error.message);
			res.sendStatus(constants.statusCodes.ise);
		}
	}
};
