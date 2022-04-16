const constants = require('../utils/constants');
const tokenService = require('../utils/auth/tokenService');
const { getEnvironmentProvider } = require('../db/models/environment/environment.service');

exports.getProviderWithCredentialsV3 = getProviderWithCredentialsV3;

function getProviderWithCredentialsV3({ queryStringParam, routeParam }) {
	return async (req, res, next) => {
		const accountId = res.locals.accountId || tokenService.getAccountIdFromToken(req);
		let environmentName;
		if (queryStringParam) {
			// the environment name is set as a query string parameter
			environmentName = req.query[queryStringParam];
		} else {
			environmentName = req.params[routeParam];
		}
		if (!environmentName) {
			res.status(constants.statusCodes.badRequest).send({ message: 'environment name must be provided' });
		} else {
			try {
				let result = await getEnvironmentProvider(accountId, environmentName);
				if (!result.success) {
					if (result.message == constants.errorMessages.models.elementNotFound) {
						res.sendStatus(constants.statusCodes.badRequest);
						return;
					}
					res.sendStatus(constants.statusCodes.ise);
					return;
				} else {
					res.locals.credentials = result.outputs.provider.backend.decryptedCredentials;
					res.locals.provider = result.outputs.provider;
					res.locals.environmentId = result.outputs.environmentId;
					next();
				}
			} catch (error) {
				console.error(error.message);
				res.sendStatus(constants.statusCodes.ise);
			}
		}
	};
}
