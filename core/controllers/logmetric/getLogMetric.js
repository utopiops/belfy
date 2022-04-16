const { handleRequest } = require('../helpers');
const constants = require('../../utils/constants');
const logMetricService = require('../../services/logmetric');
const { defaultLogger: logger } = require('../../logger');

async function getLogMetric(req, res) {
  const handle = async () => {
    const { accountId } = res.locals;

    let providerIds;
    try {
      providerIds = req.query.providerIds ? JSON.parse(req.query.providerIds) : undefined;
    } catch (e) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.badRequest,
          message: `couldn't find 'providerIds' in the query string`,
        },
      };
    }
    logger.info(`accountId:${accountId}`);
    try {
      let ret = await logMetricService.get(providerIds, accountId);
      return {
        success: true,
        outputs: {
          data: ret || [],
        },
      };
    } catch (error) {
      logger.error(error);
      return {
        success: false,
      };
    }
  };

  const extractOutput = async (outputs) => outputs;
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getLogMetric;
