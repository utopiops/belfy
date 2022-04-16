const constants = require('../../utils/constants');
const { getEnvironmentIdAndProvider } = require('../../db/models/environment/environment.service');

exports.getEnvironmentIdAndProviderName = async (accountId, environmentName, res) => {
	try {
		let result = await getEnvironmentIdAndProvider(accountId, environmentName);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			return {
				environmentId: result.outputs.id,
				providerName: result.outputs.providerName,
				providerDisplayName: result.outputs.providerDisplayName
			};
		}
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
		return;
	}
};
