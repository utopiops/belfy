const config = require('../utils/config').config;
const HttpService = require('../utils/http/index');
const HttpConfig = require('../utils/http/http-config');


exports.sendRawEmail = async (email) => {

  let message = {
    'personalizations': [
      {
        'to': email.to.map(to => ({email: to})),
        'subject': email.subject
      }
    ],
    'from': {
      'email': email.from
    }
  };

  if (email.template) {
    message.personalizations[0].dynamic_template_data = email.template.data;
    message.template_id = email.template.id
  } else if (email.content) {
    message.content = email.content
  }

  console.log(`message: ${JSON.stringify(message)}`);

  const httpConfig = new HttpConfig()
      .withBearerAuthToken(config.sendGridApiKey)
      .withCustomHeader('Content-Type', 'application/json');
  const url = `${config.sendGridUrl}/v3/mail/send`;
  return await new HttpService().post(url, message, httpConfig.config);
}