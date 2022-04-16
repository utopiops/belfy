const { handleRequest } = require("../../../helpers");
const { handleAwsRequest } = require('../helpers');
const { getCloudWatch } = require('./getCloudWatch');

async function getMetricData(req, res) {
  const handle = async () => {
    const { credentials } = res.locals;
    if (!credentials) { // This indicates that the credentials are not set
        return {
          success: false
        }
    }
    const region = res.locals.provider.backend.region;

    const baseConfig = {
        credentials,
        region,
    };
    const cloudwatch = getCloudWatch(baseConfig);

    const { queryParams } = req.body;

    const fn = () => cloudwatch.getMetricData(queryParams).promise();
    return await handleAwsRequest({fn});
  };

  const extractOutput = async (outputs) => {
    let results = {};
    outputs.MetricDataResults.map(r => {
        results[r.Id] = r.Timestamps.map((t, idx) => ({
            x: t,
            y: r.Values[idx]
        }));
    });
    return results;
  };

  return await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getMetricData;