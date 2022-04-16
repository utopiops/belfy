const HttpService = require('../utils/http');
const config = require('../utils/config').config;
const constants = require('../utils/constants');

exports.access = access;

function access({ resource, action }) {
  return async (req, res, next) => {

    if (res.locals.internal) {
      return next();
    }

    const http = new HttpService();
    const url = `${config.planManagerUrl}/user/enforce`;
    const body = {
      resource,
      action
    }
    console.log(body);
    
    const reqConfig = { headers: { Authorization: req.headers.authorization, Cookie: `id_token=${req.user.idToken}` } };
    try {
      const response = await http.post(url, body, reqConfig);
      console.log(response.data.allowed);
      if(!response.data.allowed) {
        res.sendStatus(constants.statusCodes.notAuthorized);
        return;
      }
      next();
    } catch(error) {
      console.error('error', error);
      res.sendStatus(constants.statusCodes.ise);
    }
  }
}
