const { defaultLogger: logger } = require("../../../logger");
const constants = require('../../../utils/constants');

async function handleAwsRequest({fn}) {
  try {
    const data = await fn();
    return {
      success: true,
      outputs: data,
    };
  } catch (err) {
    logger.error(err);
    return {
      success: false,
      error: {
        message: err.message,
        statusCode: constants.statusCodes.badRequest
      }
    };
  }
}

module.exports = {
  handleAwsRequest
}