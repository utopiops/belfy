const { handleRequest } = require('../helpers');
const { getApplicationKind } = require('../../db/models/application/application.service');
const constants = require('../../utils/constants');
const { defaultLogger: logger } = require('../../logger');
const config = require('../../utils/config').config;
const HttpConfig = require('../../utils/http/http-config');
const HttpService = require('../../utils/http/index');
const http = new HttpService();

async function enableLogsSettings(req, res) {
  const handle = async () => {
    const { environmentId, environmentName, provider } = res.locals;
    const { applicationName } = req.params;

    const result = await getApplicationKind(environmentId, applicationName);
    if (!result.success) {
      return result;
    }
    const applicationKind = result.output.kind;

    if (applicationKind != 'ecs' && applicationKind != 'eks_web_service' && applicationKind != 'eks_background_job') {
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    }

    try {
      const httpConfig = new HttpConfig().withCustomHeaders({
        Authorization: req.headers.authorization,
        Cookie: req.headers.cookie,
      });
      logger.info(`httpConfig:: ${JSON.stringify(httpConfig)}`);
      const url = `${config.logIntegrationUrl}/cloudwatch/environment/name/${environmentName}/application/name/${applicationName}/settings`;
      await http.post(url, { region: provider.backend.region }, httpConfig.config);
      return {
        success: true,
      };
    } catch (e) {
      logger.error(e);
      return {
        success: false,
        error: {
          statusCode: e.response ? e.response.status : constants.statusCodes.ise,
          message: 'failed to enable logs',
        },
      };
    }
  };
  await handleRequest({ req, res, handle });
}

exports.handler = enableLogsSettings;
