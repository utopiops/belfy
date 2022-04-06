import fs from 'fs';
import path from 'path';
import jose from 'node-jose';
import jwt from 'jsonwebtoken';

import constants from '../../utils/constants';

export async function generateIdToken(user: any, internal: boolean = false) {
  const ks = fs.readFileSync(path.join(__dirname, '../../keys.json'));
  const keyStore = await jose.JWK.asKeyStore(ks.toString());
  const [key] = keyStore.all({ use: 'sig' });

  const opt = { compact: true, jwk: key, fields: { typ: 'jwt' }, alg: 'RS256' };
  const payload = JSON.stringify({
    account_id: constants.localAccountId,
    sub: user.username,
    ...(!internal ? { ext: { external: true } } : {}),
    exp: Math.floor(Date.now() / 1000 + 3600 * 12), // 12 hours
    iat: Math.floor(Date.now() / 1000),
  });

  const token = await jose.JWS.createSign(opt, key).update(payload).final();

  return token;
}

export async function generateAccessToken(user: any, isInternal: boolean = false) {
  const secret = process.env.HMAC_SECRET_KEY ?? 'secret';

  const payload = {
    username: user.username,
    ...(!isInternal
      ? {
          ext: {
            external: true,
          },
        }
      : {}),
  };
  const token = jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn: '12h',
  });
  return token;
}
