const constants = require('../utils/constants');
const tokenService = require('../utils/auth/tokenService');
const EnvironmentService = require('../db/models/environment/environment.service');

exports.getProviderWithCredentialsV2 = getProviderWithCredentialsV2;

function getProviderWithCredentialsV2({ queryStringParam, routeParam }) {
  return async (req, res, next) => {
    const accountId = res.locals.accountId || tokenService.getAccountIdFromToken(req);
    let environmentName;
    if (queryStringParam) { // the environment name is set as a query string parameter
      environmentName = req.query[queryStringParam];
    } else {
      environmentName = req.params[routeParam];
    }
    if (!environmentName) {
      res.status(constants.statusCodes.badRequest).send({ message: "environment name must be provided" });
    } else {
      try {
        let result = await EnvironmentService.getEnvironmentProvider(accountId, environmentName);
        if (!result.success) {
          if (result.message == constants.errorMessages.models.elementNotFound) {
            res.sendStatus(constants.statusCodes.badRequest);
            return;
          }
          res.sendStatus(constants.statusCodes.ise);
          return
        } else {
          res.locals.credentials = result.outputs.provider.backend.decryptedCredentials
          res.locals.provider = result.outputs.provider;
          res.locals.environmentId = result.outputs.environmentId;
          res.locals.environmentName = environmentName;
          res.locals.domain = result.outputs.domain;
          next();
        }
      } catch (error) {
        console.error('error', error);
        res.sendStatus(constants.statusCodes.ise);
      }
    }
  }
}
