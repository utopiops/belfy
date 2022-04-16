const constants = require('../utils/constants');
const tokenService = require('../utils/auth/tokenService');
const EnvironmentService = require('../db/models/environment/environment.service');

exports.getProviderWithCredentialsV4 = getProviderWithCredentialsV4;

function getProviderWithCredentialsV4({ queryStringParam, routeParam, bodyParam }) {
  return async (req, res, next) => {
    const accountId = res.locals.accountId || tokenService.getAccountIdFromToken(req);
    let environmentName;
    if (queryStringParam) { // the environment name is set as a query string parameter
      environmentName = req.query[queryStringParam];
    } else if(routeParam) {
      environmentName = req.params[routeParam];
    }
    else {
      environmentName = req.body[bodyParam];
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
          next();
        }
      } catch (error) {
        console.error('error', error);
        res.sendStatus(constants.statusCodes.ise);
      }
    }
  }
}
