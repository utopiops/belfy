const config = require('../../utils/config').config;
const constants = require('../../utils/constants');
const CryptoJS = require('crypto-js');
const Group = require('../../db/models/group');
const mailService = require('../../services/mail.service');
const timeService = require('../../services/time.service');
const tokenService = require('../../utils/auth/tokenService');
const ServiceAccount = require('../../db/models/serviceAccount');
const yup = require('yup');

exports.getAll = getAll;
exports.add = add;
exports.getServiceAccount = getServiceAccount;
exports.deleteServiceAccount = deleteServiceAccount;

// Implementations
//------------------------------------------------
async function getAll(req, res, next) {
  const accountId = res.locals.accountId;
  const result = await ServiceAccount.getAll(accountId);
  if (result.success) {
    res.send(result.output.serviceAccounts);
  } else {
    res.sendStatus(constants.statusCodes.ise);
  }
}
//------------------------------------------------
async function getServiceAccount(req, res, next) {
  const accountId = res.locals.accountId;
  const name = req.params.name;
  const result = await ServiceAccount.getServiceAccount(accountId, name);
  if (result.success) {
    res.send(result.output.serviceAccount);
  } else {
    if (result.message === constants.errorMessages.models.elementNotFound) {
      res.sendStatus(constants.statusCodes.notFound);
    } else {
      res.sendStatus(constants.statusCodes.ise);
    }
  }
}
//------------------------------------------------
async function add(req, res, next) {

  // Schema validation
  const validationSchema = yup.object().shape({
    name: yup.string()
      .required(),
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  const accountId = res.locals.accountId;
  const userId = res.locals.userId;

  const toAdd = {
    name: req.body.name,
    accountId,
    userId,
  }

  const result = await ServiceAccount.add(toAdd);
  if (!result.success) {
    if (result.message == constants.errorMessages.models.duplicate) {
      res.sendStatus(constants.statusCodes.duplicate);
      return;
    }
    res.sendStatus(constants.statusCodes.ise);
  } else {
    res.sendStatus(constants.statusCodes.ok);
  }
}
//------------------------------------------------
async function deleteServiceAccount(req, res, next) {
  const accountId = res.locals.accountId;
  const name = req.params.name;

  const result = await ServiceAccount.deleteServiceAccount(accountId, name);

  if (result.success) {
    res.sendStatus(constants.statusCodes.ok);
  } else {
    if (result.message === 'Not found') {
      res.sendStatus(constants.statusCodes.badRequest);
    } else {
      res.sendStatus(constants.statusCodes.ise);
    }
  }
}