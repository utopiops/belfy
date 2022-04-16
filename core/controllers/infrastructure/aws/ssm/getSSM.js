const AWS = require("aws-sdk");
const awsApiVersions = require('../../../../utils/awsApiVersions');

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

exports.getSSM = getSSM;