const constants = require('../../utils/constants');
const tokenService = require('../../utils/auth/tokenService');
const config = require('../../utils/config').config;
const { getEnvironmentIdAndProvider, getApplicationKind } = require('./helpers');
const HttpConfig = require('../../utils/http/http-config');
const HttpService = require('../../utils/http/index');
const http = new HttpService();


exports.enableLogsSettings = enableLogsSettings;


//----------------------------------
/*
  Saves the alarm in the database, deploys it / (starts the deployment) and updates the status to deploying
*/
async function enableLogsSettings(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const { name: environmentName, applicationName } = req.params;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId, provider } = result;

  // Check if the application exist and get its id
  const applicationKindResult = await getApplicationKind(environmentId, applicationName, res);
  if (!applicationKindResult) {
    return;
  }

  // atm only ecs is supported
  const applicationKind = applicationKindResult.kind;
  if (applicationKind != "ecs") {
    res.sendStatus(constants.statusCodes.badRequest);
    return;
  }
  try {
    const httpConfig = new HttpConfig().withCustomHeader("Authorization", req.headers.authorization);
    console.log(`httpConfig::`, httpConfig.headers);
    const url = `${config.logIntegrationUrl}/cloudwatch/environment/name/${environmentName}/application/name/${applicationName}/settings`
    await http.post(url, { region: provider.backend.region }, httpConfig.config);
    res.sendStatus(constants.statusCodes.ok);
  } catch (e) {
    console.log(e.message);
    if (e.response) {
      if (e.response.status === 400) {
        res.sendStatus(constants.statusCodes.badRequest);
      } else if (e.response.status === 401) {
        res.sendStatus(constants.statusCodes.notAuthorized)
      }
    } else {
      res.sendStatus(constants.statusCodes.ise);
    }
  }
}
