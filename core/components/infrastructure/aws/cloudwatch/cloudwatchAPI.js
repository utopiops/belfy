const AWS = require('aws-sdk');
const awsApiVersions = require('../../../../utils/awsApiVersions');
const constants = require('../../../../utils/constants');
const tokenService = require('../../../../utils/auth/tokenService');
const { getEnvironmentProviderCredentials } = require('../helpers');

exports.getMetricData = getMetricData;


async function getMetricData(req, res) {

    const accountId = tokenService.getAccountIdFromToken(req);
    const environmentName = req.params.environmentName;
    const { credentials, region } = await getEnvironmentProviderCredentials(accountId, environmentName, res)
    if (!credentials) { // This means an error occurred and the response has already been sent
        return;
    }

    const baseConfig = {
        credentials,
        region
    }
    const cloudwatch = getCloudWatch(baseConfig);
    try {
        const { queryParams } = req.body;
        const resp = await cloudwatch.getMetricData(queryParams).promise();

        let results = {};
        resp.MetricDataResults.map(r => {
            results[r.Id] = r.Timestamps.map((t, idx) => ({
                x: t,
                y: r.Values[idx]
            }));
        });
        res.send(results);
    } catch (err) {
        console.log(`error: ${err.message} - ${err.code}`);
        var status = constants.statusCodes.ise;
        res.status(status).send();
    }
}

// Private functions
function getCloudWatch(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.CloudWatch({
        apiVersion: awsApiVersions.cloudwatch
    });
}


function updateConfig(baseConfig) {
    AWS.config.update({
        region: baseConfig.region,
        accessKeyId: baseConfig.credentials.accessKeyId,
        secretAccessKey: baseConfig.credentials.secretAccessKey
    });
}