const constants = require('../../utils/constants');
const EnvironmentModel = require('../../db/models/environment_application/environment');

exports.getEnvironmentIdAndProvider = async (accountId, environmentName, res) => {
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
      return result.output;
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }
}
