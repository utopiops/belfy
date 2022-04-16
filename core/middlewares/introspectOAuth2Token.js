const constants = require('../utils/constants');
const config = require('../utils/config').config;
const HttpService = require('../utils/http');
const http = new HttpService();

exports.introspectOAuth2Token = introspectOAuth2Token;

async function introspectOAuth2Token(req, res, next) {
  if (res.locals.old) {
    console.log('skipping...');
    return next();
  }
  try {
    let accessToken;
    if (req.path.split('/')[1] == 'integration' && req.path.split('/')[2] == 'callbacks') {
      accessToken = req.cookies.access_token;
    } else {
      accessToken = req.headers.authorization.split(' ')[1];
    }
    const url = `${config.idsAdminUrl}/oauth2/introspect`;
    const params = new URLSearchParams();
    params.append('token', accessToken);

    const response = await http.post(url, params);

    if (response.data.active) {
      req.user = response.data;
      if (!response.data.ext || !response.data.ext.external) res.locals.internal = true;
      return next();
    }

    return res.sendStatus(constants.statusCodes.notAuthorized);
  } catch (err) {
    console.log(err);
    return res.sendStatus(constants.statusCodes.notAuthorized);
  }
}
