const axios = require('axios');

exports.introspectOAuth2Token = introspectOAuth2Token;

function introspectOAuth2Token(accessToken) {
  try {
    const url = `${process.env.IDS_ADMIN_URL}/oauth2/introspect`;
    const params = new URLSearchParams();
    params.append('token', accessToken);

    return axios.post(url, params).then(function (response) {
      if (response.data.active) {
        return true;
      } else {
        return false;
      }
    });

  } catch (err) {
    console.log(err);
    return false;
  }
}
