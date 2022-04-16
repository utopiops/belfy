const { handleRequest } = require('../helpers');
const metricModel = require('../../db/models/environment_metric/environmentMetricProvider');
const constants = require('../../utils/constants');
const { defaultLogger: logger } = require('../../logger');

async function addMetricProviderCloudWatch(req, res) {
  const handle = async () => {
    const { userId, environmentId } = res.locals;
    const providerName = res.locals.provider.name;

    if (providerName !== 'aws') {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: `only 'aws' provider is supported at the moment`,
        },
      };
    }

    try {
      let result = await metricModel.addProviderCloudWatch(environmentId, userId);
      logger.info(`result: ${result}`);
      if (!result.success) {
        const isDup = result.message == constants.errorMessages.models.duplicate;
        return {
          success: false,
          error: {
            message: isDup
              ? constants.errorMessages.models.duplicate
              : `couldn't add metric provider cloud watch`,
            statusCode: isDup ? constants.statusCodes.duplicate : constants.statusCodes.ise,
          },
        };
      } else {
        return {
          success: true,
        };
      }
    } catch (e) {
      logger.error(e);
      return {
        success: false,
      };
    }
  };
  await handleRequest({ req, res, handle });
}

exports.handler = addMetricProviderCloudWatch;
