const constants = require("../../utils/constants");
const { defaultLogger: logger } = require('../../logger');

async function runQueryHelper(runQuery, extractOutput = () => null) {
  try {
    let result = await runQuery();
    if (!result) {
      return {
        success: false,
        error: {
          message: constants.errorMessages.models.elementNotFound,
          statusCode: constants.statusCodes.badRequest
        }
      };
    }
    else if(result.error) {
      return result;
    }
    return {
      success: true,
      outputs: extractOutput(result)
    };
  } catch (err) {
    logger.error(err)
    let message = err.message;
    let statusCode;
    if (err.code && err.code === 11000) { // in case of insert or update
      message = constants.errorMessages.models.duplicate;
      statusCode = constants.statusCodes.duplicate
    }
    return {
      success: false,
      error: {
        message,
        statusCode
      }
    };
  }
}


module.exports = {
  runQueryHelper
}
