const { handleRequest } = require('../helpers');
const constants = require('../../utils/constants');
const logMetricService = require('../../services/logmetric');
const { defaultLogger: logger } = require('../../logger');

async function deleteLogMetric(req, res) {
  const handle = async () => {
    const { accountId } = res.locals;

    const providerId = req.params.id;
    logger.info(`providerId: ${JSON.stringify(providerId)}`);
    try {
      let ret = await logMetricService.delete(providerId, accountId);
      if (!ret) {
        return {
          success: false,
          error: {
            statusCode: constants.statusCodes.notFound,
            message: `couldn't find the logMetric`,
          },
        };
      } else {
        return {
          success: true,
        };
      }
    } catch (error) {
      logger.error(error);
      return {
        success: false,
      };
    }
  };

  await handleRequest({ req, res, handle });
}

exports.handler = deleteLogMetric;
