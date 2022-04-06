import { Request, Response } from 'express';
import jose from 'node-jose';
import fs from 'fs';
import path from 'path';
import handleRequest from './handler';

async function jwks(req: Request, res: Response) {
  const handle = async (): Promise<{ outputs?: any; error?: { message: string; statusCode?: number } }> => {
    try {
      const ks = fs.readFileSync(path.join(__dirname, '../keys.json'));
      const keyStore = await jose.JWK.asKeyStore(ks.toString());

      return { outputs: keyStore.toJSON() };
    } catch (err: any) {
      console.log('error jwks:', err);
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

export default jwks;
