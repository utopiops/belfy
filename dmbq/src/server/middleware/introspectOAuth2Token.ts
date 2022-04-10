import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import constants from '../utils/constants';
import config from '../utils/config';

async function introspectOAuth2Token(req: Request, res: Response, next: NextFunction) {
  try {
    const accessToken = req.headers.authorization!.split(' ')[1];

    const url = `${config.idsAdminUrl}/oauth2/introspect`;
    const params = new URLSearchParams();
    params.append('token', accessToken);

    const response = await axios.post(url, params);

    if (response.data.active) {
      res.locals.accessToken = accessToken;
      if (!response.data.ext || !response.data.ext.external) res.locals.internal = true;
      return next();
    }

    return res.sendStatus(constants.statusCodes.notAuthorized);
  } catch (err) {
    return res.sendStatus(constants.statusCodes.notAuthorized);
  }
}

export default introspectOAuth2Token;
