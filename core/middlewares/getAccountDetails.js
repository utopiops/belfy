const constants = require('../utils/constants');
const config = require('../utils/config').config;
const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const tokenService = require('../utils/auth/tokenService');
const HttpService = require('../utils/http/index');
const http = new HttpService();

exports.getAccountDetails = getAccountDetails;

async function getAccountDetails(req, res, next) {
  try {
    // check if user is authenticated by passport or ids
    if (!res.locals.old) {
      console.log('#1');
      if (res.locals.internal) {
        if (req.body.accountId) {
          res.locals.accountId = req.body.accountId;
        }
        if (req.body.userId) {
          res.locals.userId = req.body.userId;
        }
        if (req.query.accountId) {
          res.locals.accountId = req.query.accountId;
        }
        if (req.query.userId) {
          res.locals.userId = req.query.userId;
        }
        return next();
      }
      const idToken = req.cookies.id_token;
      if (!idToken) return res.sendStatus(constants.statusCodes.badRequest);

      const jwk = await http.get(`${config.idsPublicUrl}/.well-known/jwks.json`);
      const pem = await jwkToPem(jwk.data.keys[0]);

      let decoded;
      try {
        decoded = jwt.verify(idToken, pem, { algorithms: ['RS256'] });
      } catch (error) {
        return res
          .status(constants.statusCodes.badRequest)
          .send('The provided id_token is invalid or has been expired.');
      }

      const user = {
        accountId: decoded.account_id,
        _id: decoded.user_id,
        username: decoded.sub,
        idToken,
      };

      req.user = user;
      res.locals.accountId = decoded.account_id;
      res.locals.userId = decoded.user_id;
      res.locals.headers = {
        Authorization: req.headers.authorization,
        Cookie: req.headers.cookie,
      };
    } else {
      console.log('#2');
      const accountId = tokenService.getAccountIdFromToken(req);
      const userId = tokenService.getUserIdFromToken(req);
      res.locals.accountId = accountId;
      res.locals.userId = userId;
      res.locals.headers = {
        Authorization: req.headers.authorization,
      };
    }
    next();
  } catch (error) {
    console.log(error);
    return res.sendStatus(constants.statusCodes.ise);
  }
}
