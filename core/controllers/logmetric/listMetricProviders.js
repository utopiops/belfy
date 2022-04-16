const { handleRequest } = require('../helpers');
const metricModel = require('../../db/models/environment_metric/environmentMetricProvider');
const { defaultLogger: logger } = require('../../logger');

async function listMetricProviders(req, res) {
  const handle = async () => {
    const { environmentId } = res.locals;

    try {
      let result = await metricModel.listMetricProviders(environmentId);
      if (!result.success) return result;
      return {
        success: true,
        outputs: result.output.providers,
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

exports.handler = listMetricProviders;
