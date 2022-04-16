const constants = require('../../utils/constants');
const EnvironmentModel = require('../../db/models/environment_application/environment');

exports.getEnvironmentIdAndProviderName = async (accountId, environmentName, res) => {
	try {
		let result = await EnvironmentModel.getEnvironmentIdAndProvider(accountId, environmentName);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			return {
				environmentId: result.output.id,
				providerName: result.output.providerName,
				providerDisplayName: result.output.providerDisplayName
			};
		}
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
		return;
	}
};
