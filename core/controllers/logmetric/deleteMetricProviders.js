const { handleRequest } = require('../helpers');
const metricModel = require('../../db/models/environment_metric/environmentMetricProvider');
const constants = require('../../utils/constants');
const { defaultLogger: logger } = require('../../logger');

async function deleteMetricProviders(req, res) {
  const handle = async () => {
    const { environmentId } = res.locals;

    try {
      let result = await metricModel.deleteMetricProviders(environmentId);
      if (!result.success) {
        const isNotFound = result.message == constants.errorMessages.models.elementNotFound;
        return {
          success: false,
          error: {
            statusCode: isNotFound ? constants.statusCodes.badRequest : constants.statusCodes.ise,
            message: isNotFound ? `couldn't delete the metric provider` : `internal server error`,
          },
        };
      }
      return {
        success: true,
      };
    } catch (e) {
      logger.error(e);
      return {
        success: false,
      };
    }
  };

  const extractOutput = async (outputs) => outputs;
  await handleRequest({ req, res, handle, extractOutput });
}

exports.handler = deleteMetricProviders;
