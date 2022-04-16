const constants         = require('../../utils/constants');
const tokenService      = require('../../utils/auth/tokenService');
const logMetricService  = require('../../services/logmetric');

exports.addLogMetric = async (req, res, next) => {
  const accountId = tokenService.getAccountIdFromToken(req);
  const dto = req.body;
  dto.accountId = accountId;
  var provider = Object.assign({}, dto);
  delete provider._id;
  try {
      var ret = await logMetricService.add(provider)
      res.status(constants.statusCodes.ok).send(ret._id);
  } catch (error) {
      console.error(error.message || error.body || error._body);
      if (error.name === 'ValidationError') {
        res.sendStatus(constants.statusCodes.badRequest);
      } else {
        res.sendStatus(constants.statusCodes.ise);
      }
  }
}

exports.editLogMetric = async (req, res, next) => {
  const dto = req.body;
  console.log(`body: ${JSON.stringify(dto)}`);
  var provider = Object.assign({}, dto);
  provider._id = req.params.id;
  const accountId = tokenService.getAccountIdFromToken(req);
  try {
      var ret = await logMetricService.edit(provider, accountId)
      if (!ret) {
        res.sendStatus(constants.statusCodes.badRequest);
      } else {
        res.sendStatus(constants.statusCodes.ok)
      }
  } catch (error) {
      if (error.name === 'IllegalOperation') {
        res.status(constants.statusCodes.badRequest).send(error.message);
        return;
      }
      else if (error.message === 'Entity not found') {
        res.sendStatus(constants.statusCodes.notFound);
        return;
      }
      else {
        console.error(error.message || error.body || error._body);
        res.sendStatus(constants.statusCodes.ise);
      }
  }
}

exports.deleteLogMetric = async (req, res, next) => {
  const providerId = req.params.id;
  const accountId = tokenService.getAccountIdFromToken(req);
  console.log(`providerId: ${JSON.stringify(providerId)}`);
  try {
      var ret = await logMetricService.delete(providerId, accountId);
      if (!ret) {
        res.sendStatus(constants.statusCodes.notFound);
        return;
      } else {
        res.sendStatus(constants.statusCodes.ok)
        return;
      }
  } catch (error) {
      console.error(error.message || error.body || error._body);
      res.sendStatus(constants.statusCodes.ise);
  }
}

exports.getLogMetric = async (req, res, next) => {
  var providerIds;
  try {
    providerIds = req.query.providerIds ? JSON.parse(req.query.providerIds) : undefined;
  } catch (e) {
    res.sendStatus(constants.statusCodes.badRequest);
    return;
  }
  const accountId = tokenService.getAccountIdFromToken(req);
  console.log(`accountId:${accountId}`);
  try {
      var ret = await logMetricService.get(providerIds, accountId);
      res.send({
        data: ret || []
      });
  } catch (error) {
      console.error(error.message || error.body || error._body);
      res.sendStatus(constants.statusCodes.ise);
  }
}
