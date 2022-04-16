const HttpService = require('../utils/http');
const config = require('../utils/config').config;
const constants = require('../utils/constants');

exports.authorize = authorize;

function authorize({ resource, action, params }) {
  return async (req, res, next) => {
    return next();
    let resourceString = 'core::' + resource + '/';
    if(params) {
      for(let p of params) {
        if(p.type === 'route') {
          resourceString += req.params[p.key];
        }
        else if(p.type === 'query') {
          resourceString += req.query[p.key];
        }
        else if(p.type === 'body') {
          if(!req.body[p.key]) {
            res.status(constants.statusCodes.badRequest).send({
              message: `${p.key} is a required field`
            });
            return;
          }
          resourceString += req.body[p.key];
        }
        resourceString += '/';
      }
    }

    if (res.locals.internal) {
      return next();
    }

    const http = new HttpService();
    const url = `${config.accessManagerUrl}/policy/enforce`;
    const body = {
      userId: req.user.username,
      resource: resourceString,
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
