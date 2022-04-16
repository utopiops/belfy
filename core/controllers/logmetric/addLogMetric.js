const { handleRequest } = require('../helpers');
const constants = require('../../utils/constants');
const logMetricService = require('../../services/logmetric');
const { defaultLogger: logger } = require('../../logger');

async function addLogMetric(req, res) {
  const handle = async () => {
    const { accountId } = res.locals;

    const dto = req.body;
    dto.accountId = accountId;
    let provider = Object.assign({}, dto);
    delete provider._id;

    try {
      let ret = await logMetricService.add(provider);
      return {
        success: true,
        outputs: ret._id,
      };
    } catch (error) {
      logger.error(error);
      return {
        success: false,
        error: {
          statusCode:
            error.name === 'ValidationError'
              ? constants.statusCodes.badRequest
              : constants.statusCodes.ise,
          message: `couldn't add the logMetric`,
        },
      };
    }
  };

  const extractOutput = async (outputs) => outputs;
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = addLogMetric;
