const constants = require('../../../utils/constants');
const EnvironmentModel = require('../../../db/models/environment_application/environment');
const provider = require('../../../db/models/provider/provider');


exports.getEnvironmentRegionAndProviderName = async (accountId, environmentName, res) => {
  try {
    let result = await EnvironmentModel.getEnvironmentRegionAndProviderName(accountId, environmentName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return true;
    } else {
      return {
        providerName: result.output.providerName,
        region: result.output.region,
      }
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }
}


exports.getEnvironmentProviderCredentials = async (accountId, environmentName, res) => {

  let providerDisplayName, region;
  try {
    let result = await EnvironmentModel.getEnvironmentRegionAndProviderName(accountId, environmentName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      providerDisplayName = result.output.providerName;
      region = result.output.region;
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }
  let credentials;
  try {
    const result = await provider.findOne({accountId, displayName: providerDisplayName}).exec();
    if (!result) {
      res.status(constants.statusCodes.badRequest).send();
      return;
    }
    credentials = result.backend.decryptedCredentials;
  } catch (error) {
    res.status(constants.statusCodes.ise).send();
    return;
  }
  return {
    credentials, region
  }
}