const jwt = require('jsonwebtoken');
const jwkToPem = require('jwk-to-pem');
const axios = require('axios');

exports.getAccountDetails = getAccountDetails;

async function getAccountDetails(idToken) {
  try {
      const jwk = await axios.get(`${process.env.IDS_PUBLIC_URL}/.well-known/jwks.json`);
      const pem = jwkToPem(jwk.data.keys[0]);

      let decoded;
      try {
        decoded = jwt.verify(idToken, pem, { algorithms: ['RS256'] });
      } catch (error) {
        return false;
      }

      return {
        accountId: decoded.account_id,
        userId: decoded.user_id,
      }
    
  } catch (error) {
    console.log(error);
    return false;
  }
}
