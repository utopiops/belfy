const constants = require('../../utils/constants');
const tokenService = require('../../utils/auth/tokenService');
const metricModel = require('../../db/models/environment_metric/environmentMetricProvider');
const yup = require('yup');
const { getEnvironmentIdAndProviderName } = require('./helpers');

exports.addMetricProviderCloudWatch = addMetricProviderCloudWatch;
exports.listMetricProviders = listMetricProviders;
exports.deleteMetricProviders = deleteMetricProviders;


async function addMetricProviderCloudWatch(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const { name: environmentName } = req.params;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProviderName(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId, providerName } = result;

  if (providerName !== 'aws') {
    res.sendStatus(constants.statusCodes.badRequest);
    return;
  }

  try {
    let result = await metricModel.addProviderCloudWatch(environmentId, userId);
    console.log(`result`, result);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.duplicate) {
        res.sendStatus(constants.statusCodes.duplicate);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (e) {
    res.sendStatus(constants.statusCodes.ise);
  }
}
//------------------------------------------
async function listMetricProviders(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const { name: environmentName } = req.params;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProviderName(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  try {
    let result = await metricModel.listMetricProviders(environmentId);
    if (result.success) {
      res.send(result.output.providers);
    } else {
      if (result.message == constants.errorMessages.models.duplicate) {
        res.sendStatus(constants.statusCodes.notFound);
      } else {
        res.sendStatus(constants.statusCodes.ise);
      }
    }
  } catch (e) {
    res.sendStatus(constants.statusCodes.ise);
  }
}
//------------------------------------------
async function deleteMetricProviders(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const { name: environmentName } = req.params;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProviderName(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  try {
    let result = await metricModel.deleteMetricProviders(environmentId);
    if (result.success) {
      res.sendStatus(constants.statusCodes.ok);
    } else {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
      } else {
        res.sendStatus(constants.statusCodes.ise);
      }
    }
  } catch (e) {
    res.sendStatus(constants.statusCodes.ise);
  }
}
