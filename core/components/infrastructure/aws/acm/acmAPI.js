const AWS = require('aws-sdk');
const awsApiVersions = require('../../../../utils/awsApiVersions');
const constants = require('../../../../utils/constants');
const configHandler = require('../../../../utils/config');
const tokenService = require('../../../../utils/auth/tokenService');
const provider = require('../../../../db/models/provider');
const EnvironmentModel = require('../../../../db/models/environment_application/environment');

const config = new configHandler();

exports.listCertificatesByEnvironmentNameV2 = listCertificatesByEnvironmentNameV2;

exports.listCertificates = async (req, res, next) => {

    const accountId = tokenService.getAccountIdFromToken(req);
    const credentials = await config.getAccountCredentials(accountId, constants.applicationProviders.aws);
    if (!credentials) { // This indicates that the credentials are not set
        res.status(400).send();
        return;
    }
    const baseConfig = {
        credentials
    }
    baseConfig.region = req.query.region;

    const acm = getAcm(baseConfig);
    try {
        const data = await acm.listCertificates({}).promise();
        res.send(data.CertificateSummaryList.map((c, k) => {
            return { arn: c.CertificateArn, domainName: c.DomainName }
        }));
    } catch (err) {
        console.log(`error: ${err.message} - ${err.code}`);
        var status = 500;
        if (err.code === 'UnknownEndpoint') {
            status = 400
        } else if (err.code === 'UnrecognizedClientException') {
            status = 403
        }
        res.status(status).send();
    }
}

exports.listCertificatesV2 = async (req, res, next) => {

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

    const acm = getAcm(baseConfig);
    try {
        const data = await acm.listCertificates({}).promise();
        res.send(data.CertificateSummaryList.map((c, k) => {
            return { arn: c.CertificateArn, domainName: c.DomainName }
        }));
    } catch (err) {
        console.log(`error: ${err.message} - ${err.code}`);
        var status = constants.statusCodes.ise;
        res.status(status).send();
    }
}
async function listCertificatesByEnvironmentNameV2(req, res, next) {

    const accountId = tokenService.getAccountIdFromToken(req);
    const environmentName = req.params.environmentName;
    let providerName, region;
    try {
        let result = await EnvironmentModel.getEnvironmentRegionAndProviderName(accountId, environmentName);
        if (!result.success) {
            if (result.message == constants.errorMessages.models.elementNotFound) {
                res.sendStatus(constants.statusCodes.badRequest);
                return;
            }
            res.sendStatus(constants.statusCodes.ise);
            return;
        } else {
            providerName = result.output.providerName;
            region = result.output.region;
        }
    } catch (error) {
        console.error(error.message);
        res.sendStatus(constants.statusCodes.ise);
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

    const acm = getAcm(baseConfig);
    try {
        const data = await acm.listCertificates({}).promise();
        res.send(data.CertificateSummaryList.map((c, k) => {
            return { arn: c.CertificateArn, domainName: c.DomainName }
        }));
    } catch (err) {
        console.log(`error: ${err.message} - ${err.code}`);
        var status = constants.statusCodes.ise;
        res.status(status).send();
    }
}

// Private functions
function getAcm(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.ACM({
        apiVersion: awsApiVersions.acm
    });
}


function updateConfig(baseConfig) {
    AWS.config.update({
        region: baseConfig.region,
        accessKeyId: baseConfig.credentials.accessKeyId,
        secretAccessKey: baseConfig.credentials.secretAccessKey
    });
}