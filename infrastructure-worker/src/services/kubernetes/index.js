const logger = require('../../shared/logger');
const find = require('lodash/find');
const AwsKubernetesHandler = require('./aws');

class KubernetesService {
    async createIsolatedApplication(provider, params, k8sConfigPath) {
        const handlers = [new AwsKubernetesHandler()];
        const handler = find(handlers, h => h.canHandle(provider));

        logger.verbose(`Creating isolated application with params: ${JSON.stringify(params)}`);
        // TODO: Preprocess the params and extract the clusterDetails and the applicationDetails;
        const accountId = params.accountId;
        const infrastructureDetails = params.details.infrastructure;
        const clusterDetails = {
            accessKey: 'AKIAIQNLNXILP42UMQRA', // TODO: Get these from the DB
            secretKey: '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',
            region: 'ap-southeast-2',
            clusterName: infrastructureDetails.clusterName,
            maxInstanceSize: infrastructureDetails.maxInstanceSize,
            minInstanceSize: infrastructureDetails.minInstanceSize,
            desiredCapacity: infrastructureDetails.desiredCapacity,
            instanceType: infrastructureDetails.instanceType,
            rootVolumeSize: infrastructureDetails.rootVolumeSize,
            rootVolumeType: infrastructureDetails.rootVolumeType,
            rootVolumeDelOnTerm: infrastructureDetails.rootVolumeDelOnTerm,
            ecsKeyPairName: infrastructureDetails.ecsKeyPairName
        };
        logger.verbose(`clusterDetails: ${JSON.stringify(clusterDetails, null, 2)}`);
        const applicationDetails = params.details.application;

        const cluster = handler.createIsolatedApplication(accountId, clusterDetails, k8sConfigPath);
    }

    async deployApplication(clusterDetails, applicationDetails) {

    }

}

module.exports = KubernetesService;