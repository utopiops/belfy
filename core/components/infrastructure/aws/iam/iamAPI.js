const AWS = require('aws-sdk');
const tokenService = require('../../../../utils/auth/tokenService');
const User = require('../../../../db/models/user');
const constants = require('../../../../utils/constants');
const configHandler = require('../../../../utils/config');
const provider = require('../../../../db/models/provider');
const { getEnvironmentRegionAndProviderName } = require('../helpers');


const config = new configHandler();
exports.listEc2IamRolesByEnvName = listEc2IamRolesByEnvName;


exports.getAllRoles = async (req, res, next) => {

    const accountId = tokenService.getAccountIdFromToken(req);
    const credentials = await config.getAccountCredentials(accountId, constants.applicationProviders.aws);

    if (!credentials) { // This indicates that the credentials are not set
        res.status(400).send();
        return;
    }
    const baseConfig = {
        credentials
    }

    const iam = getIam(baseConfig);

    var params = {};

    iam.listRoles(params, (err, data) => {
        if (err) {
            res.status(err.statusCode || 500).send();
        } else {
            res.send(data.Roles.map((r, k) => {
                return { arn: r.Arn, name: r.RoleName }
            }));
        }
    })
}

async function listEc2IamRolesByEnvName(req, res, next) {
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
        console.log(`error:`, error.message);
        res.status(constants.statusCodes.ise).send();
        return;
    }

    const baseConfig = {
        credentials,
        region: parsed.region
    }

    try {
        const iam = getIam(baseConfig);
        const roles = await iam.listRoles({}).promise();
        res.send(roles.Roles.map((r, k) => {
            return { arn: r.Arn, name: r.RoleName }
        }));

    } catch (err) {
        console.log(`error: ${err.message} - ${err.code}`);
        var status = constants.statusCodes.ise;
        res.status(status).send();
    }
}

// Private functions
function getIam(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.IAM({
        apiVersion: '2010-05-08'
    });
}


function updateConfig(baseConfig) {
    AWS.config.update({
        region: baseConfig.region,
        accessKeyId: baseConfig.credentials.accessKeyId,
        secretAccessKey: baseConfig.credentials.secretAccessKey
    });
}