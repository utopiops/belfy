const tokenService = require('../utils/auth/tokenService');

exports.getAccountDetails = getAccountDetails;

async function getAccountDetails(req, res, next) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  res.locals.accountId = accountId;
  res.locals.userId = userId;
  next();
}