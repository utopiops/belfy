import { Request, Response } from 'express';
import * as yup from 'yup';
import data from '../users.json';
import handleRequest from './handler';
import constants from '../utils/constants';
import { generateIdToken, generateAccessToken } from '../services/auth';

async function login(req: Request, res: Response) {
  const validationSchema = yup.object().shape({
    username: yup.string().required(),
    password: yup.string().required(),
  });

  const handle = async (): Promise<{ outputs?: any; error?: { message: string; statusCode?: number } }> => {
    try {
      const { username, password } = req.body;
      const found = data.users.find(
        (user: { username: string; password: string }) => user.username === username && user.password === password,
      );

      if (!found) {
        return {
          error: {
            message: 'Invalid username or password',
            statusCode: constants.statusCodes.notAuthorized,
          },
        };
      }

      const idToken = await generateIdToken(found);
      const accessToken = await generateAccessToken(found);

      return {
        outputs: {
          access_token: accessToken,
          id_token: idToken,
        },
      };
    } catch (err: any) {
      console.log('error login:', err);
      return {
        error: {
          message: err.message,
        },
      };
    }
  };

  const extractOutput = async (outputs: any) => outputs;

  await handleRequest({ req, res, handle, extractOutput, validationSchema });
}

export default login;
