import { Request, Response } from 'express';
import data from '../secrets.json';
import handleRequest from './handler';
import constants from '../utils/constants';
import { generateInternalToken } from '../services/auth';

async function internalToken(req: Request, res: Response) {
  const handle = async (): Promise<{ outputs?: any; error?: { message: string; statusCode?: number } }> => {
    try {
      // check for basic auth header
      if (!req.headers.authorization || req.headers.authorization.indexOf('Basic ') === -1) {
        return {
          error: {
            message: 'Missing Authorization Header',
            statusCode: constants.statusCodes.notAuthorized,
          },
        };
      }

      const base64Credentials = req.headers.authorization.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [id, secret] = credentials.split(':');

      const found = data.clients.find((client: { id: string; secret: string }) => client.id === id && client.secret === secret);

      if (!found) {
        return {
          error: {
            message: 'Invalid Authentication Credentials',
            statusCode: constants.statusCodes.notAuthorized,
          },
        };
      }

      const accessToken = await generateInternalToken(found);

      return {
        outputs: {
          access_token: accessToken,
        },
      };
    } catch (err: any) {
      console.log('error internalToken:', err);
      return {
        error: {
          message: err.message,
        },
      };
    }
  };

  const extractOutput = async (outputs: any) => outputs;

  await handleRequest({ req, res, handle, extractOutput });
}

export default internalToken;
