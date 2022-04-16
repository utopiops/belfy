const AWS = require("aws-sdk");
const awsApiVersions = require('../../../../utils/awsApiVersions');

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

exports.getCloudWatch = getCloudWatch