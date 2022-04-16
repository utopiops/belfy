const constants = require('../../utils/constants');
const EnvironmentModel = require('../../db/models/environment_application/environment');
const EnvironmentApplicationModel = require('../../db/models/environment_application/application');



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
        providerDisplayName: result.output.providerDisplayName,
      };
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }
}

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


exports.getApplicationKind = async (environmentId, applicationName, res) => {
  try {
    let result = await EnvironmentApplicationModel.getApplicationKind(environmentId, applicationName);
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
  } catch (e) {
    console.log(`error:`, e.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }
}