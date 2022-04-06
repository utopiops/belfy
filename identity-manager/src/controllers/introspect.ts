import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import handleRequest from './handler';

async function introspect(req: Request, res: Response) {
  const handle = async (): Promise<{ outputs?: any; error?: { message: string; statusCode?: number } }> => {
    try {
      const { token } = req.body;
      const secret = process.env.HMAC_SECRET_KEY ?? 'secret';
      let decoded = {};
      try {
        decoded = jwt.verify(token, secret);
      } catch (error) {
        return {
          outputs: {
            active: false,
          },
        };
      }

      return {
        outputs: {
          active: true,
          ...decoded,
        },
      };
    } catch (err: any) {
      console.log('error introspect:', err);
      return {
        error: {
          message: 'this token is invalid or has been expired',
        },
      };
    }
  };

  const extractOutput = async (outputs: any) => outputs;

  await handleRequest({ req, res, handle, extractOutput });
}

export default introspect;
