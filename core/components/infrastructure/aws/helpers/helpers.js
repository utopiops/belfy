const provider = require("../../../../db/models/provider");
const constants = require("../../../../utils/constants");
const EnvironmentModel = require('../../../../db/models/environment_application/environment');

exports.getEnvironmentProviderCredentials = getEnvironmentProviderCredentials;

async function getEnvironmentProviderCredentials(accountId, environmentName, res) {

  let providerName, region;
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
      providerName = result.output.providerName;
      region = result.output.region;
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
    return;
  }
  let credentials;
  try {
    const result = await provider.getAccountCredentials(accountId, providerName);
    if (!result.success) {
      res.status(constants.statusCodes.badRequest).send();
      return;
    }
    credentials = result.output.credentials;
  } catch (error) {
    res.status(constants.statusCodes.ise).send();
    return;
  }
  return {
    credentials, region
  }
}