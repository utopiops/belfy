const constants = require('../utils/constants');
const tokenService = require('../utils/auth/tokenService');
const EnvironmentModel = require('../db/models/environment_application/environment');

exports.getProviderWithCredentials = getProviderWithCredentials;

function getProviderWithCredentials({ queryStringParam, routeParam }) {
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
				let result = await EnvironmentModel.getEnvironmentProvider(accountId, environmentName);
				if (!result.success) {
					if (result.message == constants.errorMessages.models.elementNotFound) {
						res.sendStatus(constants.statusCodes.badRequest);
						return;
					}
					res.sendStatus(constants.statusCodes.ise);
					return;
				} else {
					console.log(`result.output`, JSON.stringify(result.output));
					res.locals.credentials = result.output.provider.backend.decryptedCredentials;
					res.locals.provider = result.output.provider;
					res.locals.environmentId = result.output.environmentId;
					next();
				}
			} catch (error) {
				console.error(error);
				res.sendStatus(constants.statusCodes.ise);
			}
		}
	};
}
