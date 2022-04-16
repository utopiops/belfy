const { handleRequest } = require('../helpers');
const yup = require('yup');
const constants = require('../../utils/constants');
const config = require('../../utils/config').config;
const HttpConfig = require('../../utils/http/http-config');
const HttpService = require('../../utils/http/index');
const http = new HttpService();
const timeService = require('../../services/time.service');
const { defaultLogger: logger } = require('../../logger');

async function demoRequest(req, res, next) {
  const validationSchema = yup.object().shape({
    name: yup.string().required(),
    organization: yup.string().required(),
    email: yup.string().required(),
  });

  const handle = async () => {
    const { name, organization, email } = req.body;

    try {
      const httpConfig = new HttpConfig().withBearerAuthToken(config.slackDemoBotToken);
      const url = `https://slack.com/api/chat.postMessage`;
      const postBody = {
        channel: config.slackDemoChannelId,
        text: ':fire: New Demo Request :fire:',
        blocks: `[
                {
                    "type": "header",
                    "text": {
                        "type": "plain_text",
                        "text": ":fire: New Demo Request :fire:",
                        "emoji": true
                    }
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": "*Requested by:*\n${name}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*Organization:*\n${organization}"
                        }
                    ]
                },
                {
                    "type": "section",
                    "fields": [
                        {
                            "type": "mrkdwn",
                            "text": "*Request time (UTC):*\n${timeService.prettyNow()}"
                        },
                        {
                            "type": "mrkdwn",
                            "text": "*Email:*\n<mailto:${email}|${email}>"
                        }
                    ]
                },
                {
                    "type": "section",
                    "text": {
                        "type": "mrkdwn",
                        "text": ":mailbox:  <mailto:${email}|Respond with email>"
                    }
                }
            ]`,
      };
      logger.info(`slack httpConfig:: ${JSON.stringify(httpConfig)}`);
      const result = await http.post(url, postBody, httpConfig.config);
      if (!result.data.ok) {
        return {
          success: false,
        };
      }
      return {
        success: true,
      };
    } catch (e) {
      logger.error(e);
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.ise,
          message: 'failed to send slack message',
        },
      };
    }
  };

  return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = demoRequest;
