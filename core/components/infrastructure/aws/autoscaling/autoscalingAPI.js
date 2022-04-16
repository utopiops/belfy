const AWS = require('aws-sdk');
const awsApiVersions = require('../../../../utils/awsApiVersions');
const constants = require('../../../../utils/constants');
const tokenService = require('../../../../utils/auth/tokenService');

const yup = require('yup');
const { getEnvironmentProviderCredentials } = require('../helpers');

exports.listAutoScalingGroupInstances = listAutoScalingGroupInstances;


async function listAutoScalingGroupInstances(req, res) {

    const accountId = tokenService.getAccountIdFromToken(req);
    const validationSchema = yup.object().shape({
        environmentName: yup.string()
            .required(),
        asgName: yup.string()
            .required(),
    });
    try {
        validationSchema.validateSync(req.body);
    } catch (err) {
        res.status(constants.statusCodes.ue).send(err.message);
        return;
    }

    const { environmentName, asgName } = req.body;
    const { credentials, region } = await getEnvironmentProviderCredentials(accountId, environmentName, res)
    if (!credentials) { // This means an error occurred and the response has already been sent
        return;
    }

    const baseConfig = {
        credentials,
        region
    }
    const autoScaling = getAutoScaling(baseConfig);
    try {
        var params = {
            AutoScalingGroupNames: [
                asgName
            ]
        };
        const resp = await autoScaling.describeAutoScalingGroups(params).promise();
        const instances = (resp.AutoScalingGroups && resp.AutoScalingGroups[0] && resp.AutoScalingGroups[0].Instances) || [];
        res.status(constants.statusCodes.ok).send(instances);
    } catch (err) {
        console.log(`error: ${err.message} - ${err.code}`);
        var status = constants.statusCodes.ise;
        res.status(status).send();
    }
}


// Private functions
function getAutoScaling(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.AutoScaling({
        apiVersion: awsApiVersions.autoscaling
    });
}


function updateConfig(baseConfig) {
    AWS.config.update({
        region: baseConfig.region,
        accessKeyId: baseConfig.credentials.accessKeyId,
        secretAccessKey: baseConfig.credentials.secretAccessKey
    });
}