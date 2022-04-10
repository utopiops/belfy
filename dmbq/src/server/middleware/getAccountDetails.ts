import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import jwt, { JwtPayload } from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import constants from '../utils/constants';
import config from '../utils/config';

const { ObjectId } = require('mongoose').Types;

async function getAccountDetails(req: Request, res: Response, next: NextFunction) {
  try {
    res.locals.headers = {
      Authorization: req.headers.authorization,
    };
    if (res.locals.internal) {
      if (req.body.accountId) {
        res.locals.accountId = new ObjectId(req.body.accountId);
      }
      if (req.body.userId) {
        res.locals.userId = new ObjectId(req.body.userId);
      }
      return next();
    }
    res.locals.headers = {
      ...res.locals.headers,
      Cookie: req.headers.cookie,
    };
    const idToken = req.cookies.id_token;
    if (!idToken) return res.sendStatus(constants.statusCodes.badRequest);

    const jwk = await axios.get(config.jwksUrl!);
    const pem = jwkToPem(jwk.data.keys[0]);

    let decoded: JwtPayload | string;
    try {
      decoded = jwt.verify(idToken, pem, { algorithms: ['RS256'] });
    } catch (error) {
      return res.status(constants.statusCodes.badRequest).send('The provided id_token is invalid or has been expired.');
    }

    res.locals.idToken = idToken;

    // @ts-ignore
    res.locals.accountId = new ObjectId(decoded.account_id);
    // @ts-ignore
    res.locals.userId = new ObjectId(decoded.user_id);
    return next();
  } catch (error) {
    console.log(error);
    return res.sendStatus(constants.statusCodes.ise);
  }
}

export default getAccountDetails;
