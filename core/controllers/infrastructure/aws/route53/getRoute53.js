const AWS = require("aws-sdk");
const awsApiVersions = require('../../../../utils/awsApiVersions');

// Private functions
function getRoute53(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.Route53({
        apiVersion: awsApiVersions.route53
    });
}


function updateConfig(baseConfig) {
    AWS.config.update({
        region: baseConfig.region,
        accessKeyId: baseConfig.credentials.accessKeyId,
        secretAccessKey: baseConfig.credentials.secretAccessKey
    });
}

exports.getRoute53 = getRoute53;