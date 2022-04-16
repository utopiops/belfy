const AWS = require('aws-sdk');
const awsApiVersions = require('../../../../utils/awsApiVersions');
const constants = require('../../../../utils/constants');
const configHandler = require('../../../../utils/config');
const tokenService = require('../../../../utils/auth/tokenService');
const provider = require('../../../../db/models/provider');
const { getEnvironmentRegionAndProviderName } = require('../helpers');

const config = new configHandler();


exports.listKeyPairs = listKeyPairs;
exports.listEc2KeyPairsByEnvName = listEc2KeyPairsByEnvName;
// todo: delete this
async function listKeyPairs(req, res, next) {
    const accountId = tokenService.getAccountIdFromToken(req);
    const providerName = req.query.providerName;
    const region = req.query.region;
    if (!providerName || !region) {
        res.status(constants.statusCodes.badRequest).send();
        return;
    }
    let credentials;
    try {
        const result = await provider.getAccountCredentials(accountId, providerName);
        if (!result.success) {
            res.status(constants.statusCodes.badRequest).send();
            return;
        }
        credentials = result.output.credentials;
    } catch (error) {
        res.status(constants.statusCodes.ise).send();
        return;
    }

    const baseConfig = {
        credentials,
        region
    }

    const ec2 = getEc2(baseConfig);
    try {
        const data = await ec2.describeKeyPairs({}).promise();
        res.send(data.KeyPairs.map(kp => ({
            id: kp.KeyName,
            name: kp.KeyName,
        })));
    } catch (err) {
        console.log(`error: ${err.message} - ${err.code}`);
        var status = constants.statusCodes.ise;
        res.status(status).send();
    }
}

async function listEc2KeyPairsByEnvName(req, res, next) {
    const accountId = tokenService.getAccountIdFromToken(req);
    const environmentName = req.params.environmentName;
    const parsed = await getEnvironmentRegionAndProviderName(accountId, environmentName, res);
    if (!parsed) {
        return; // The response is already sent from the helper
    }

    let credentials;
    try {
        const result = await provider.getAccountCredentials(accountId, parsed.providerName);
        if (!result.success) {
            res.status(constants.statusCodes.badRequest).send();
            return;
        }
        credentials = result.output.credentials;
    } catch (error) {
        res.status(constants.statusCodes.ise).send();
        return;
    }

    const baseConfig = {
        credentials,
        region: parsed.region
    }

    const ec2 = getEc2(baseConfig);
    try {
        const data = await ec2.describeKeyPairs({}).promise();
        res.send(data.KeyPairs.map(kp => ({
            id: kp.KeyName,
            name: kp.KeyName,
        })));
    } catch (err) {
        console.log(`error: ${err.message} - ${err.code}`);
        var status = constants.statusCodes.ise;
        res.status(status).send();
    }
}

// Private functions
function getEc2(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.EC2({
        apiVersion: '2016-11-15'
    });
}


function updateConfig(baseConfig) {
    AWS.config.update({
        region: baseConfig.region,
        accessKeyId: baseConfig.credentials.accessKeyId,
        secretAccessKey: baseConfig.credentials.secretAccessKey
    });
}