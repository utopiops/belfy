const AWS = require('aws-sdk');
const awsApiVersions = require('../../../../utils/awsApiVersions');
const constants = require('../../../../utils/constants');
const configHandler = require('../../../../utils/config');
const tokenService = require('../../../../utils/auth/tokenService');

const config = new configHandler();


exports.getParametersValues = async (req, res) => {

    // const accountId = tokenService.getAccountIdFromToken(req);
    // TODO: Should not use this at all
    // const credentials = await config.getAccountCredentials(accountId, constants.applicationProviders.aws);
    const credentials = res.locals.credentials;
    console.log(`credentials:`, credentials);
    if (!credentials) { // This indicates that the credentials are not set
        res.status(400).send();
        return;
    }
    // TODO: add validation

    try {
        const region = req.query.region; // validation: string and valid aws region
        const names = req.query.names.split(","); // validation: array of strings
        console.log(`names:${JSON.stringify(names)}`);

        const baseConfig = {
            credentials,
            region,
        };

        const ssm = getSSM(baseConfig);
        var params = {
            Names: names,
        };
        const data = await ssm.getParameters(params).promise();
        if (data && data.Parameters) {
            const values = data.Parameters.map(p => {
                const value = JSON.parse(p.Value);
                return value.image_id;
            });
            res.send(values);
        } else {
            res.status(500).send();
        }
    } catch (err) {
        console.log(`error: ${err.message} - ${err.code}`);
        var status = 500;
        if (err.code === 'UnknownEndpoint') {
            status = 400;
        } else if (err.code === 'UnrecognizedClientException') {
            status = 403;
        }
        res.status(status).send();
    }
}

// Private functions
function getSSM(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.SSM({
        apiVersion: awsApiVersions.ssm
    });
}


function updateConfig(baseConfig) {
    AWS.config.update({
        region: baseConfig.region,
        accessKeyId: baseConfig.credentials.accessKeyId,
        secretAccessKey: baseConfig.credentials.secretAccessKey
    });
}