const logger = require('../../../shared/logger');
const constants = require('../../../shared/constants');
const KubernetesService = require('../../../services/kubernetes');
const kubernetesService = new KubernetesService();

class AwsK8sMongoDbHandler {
    canHandle = (topic) => {
        logger.verbose(`canHandle ${topic} called in AwsK8sMongoDbHandler`);
        return topic === constants.topics.createK8sMongoDb;
    }
    // TODO: Add exception handling
    handle = async (jobDetails) => {

        logger.verbose(`AwsK8sMongoDbHandler handling the job`);
        // Create the k8s cluster and deploy mongodb on the cluster
        const clusterDetails = kubernetesService.createIsolatedApplication('aws', jobDetails, 'aws/mongodb/v1'); // TODO: Get the version (v1) from the user input
        // Save the details in DB
        
    }
}

module.exports = AwsK8sMongoDbHandler;