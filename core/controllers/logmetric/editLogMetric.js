const { handleRequest } = require('../helpers');
const constants = require('../../utils/constants');
const logMetricService = require('../../services/logmetric');
const { defaultLogger: logger } = require('../../logger');

async function editLogMetric(req, res) {
  const handle = async () => {
    const { accountId } = res.locals;

    const dto = req.body;
    logger.info(`body: ${JSON.stringify(dto)}`);
    let provider = Object.assign({}, dto);
    provider._id = req.params.id;
    try {
      let ret = await logMetricService.edit(provider, accountId);
      if (!ret) {
        return {
          success: false,
          error: {
            statusCode: constants.statusCodes.badRequest,
            message: `couldn't edit the logMetric`,
          },
        };
      } else {
        return {
          success: true,
        };
      }
    } catch (error) {
      logger.error(error);
      let statusCode;
      if (error.name === 'IllegalOperation') {
        statusCode = constants.statusCodes.badRequest;
      } else if (error.message === 'Entity not found') {
        statusCode = constants.statusCodes.notFound;
      }
      return {
        success: false,
        error: {
          statusCode: statusCode ? statusCode : constants.statusCodes.ise,
          message: error.message ? error.message : `couldn't edit the logMetric`,
        },
      };
    }
  };

  await handleRequest({ req, res, handle });
}

exports.handler = editLogMetric;
