let ApplicationHandlerV4 = require('../handler/application-handler-v4');
let EnvironmentHandler = require('../handler/environment-handler');
let DatabaseHandler = require('../handler/database-handler');
let TerraformModuleHandler = require('../handler/terraformModule-handler');
let CloudWatchAlarmHandler = require('../handler/cloudwatch-alarm-handler-v2');
let KubernetesHandler = require('../handler/kubernetes-handler');
let ElasticacheRedisHandler = require('../handler/elasticache-redis-handler');
let UtopiopsApplicationHandler = require('../handler/utopiops-application-handler');
let JobService = require('../services/job');
let ProviderHandler = require('../handler/provider-handler');
let userHelper = require('../shared/user.helper');
let UtilityHandler = require('../handler/utility-handler');
const ACMCertificateHandler = require('../handler/aws-acm-handler');
const ACMCertificateHandlerV2 = require('../handler/aws-acm-handler-v2');
const logger = require('../shared/logger');
// let AwsK8sMongoDbHandler        = require('../handler/aws/database/awsK8sMongoDbHandler');

let loadJobHandlers = [];
let jobService = new JobService();

exports.loadJobhandlers = () => {
    loadJobHandlers.push(new CloudWatchAlarmHandler());
    loadJobHandlers.push(new ProviderHandler());
    loadJobHandlers.push(new ACMCertificateHandler());
    loadJobHandlers.push(new ACMCertificateHandlerV2());
    loadJobHandlers.push(new UtilityHandler());
    loadJobHandlers.push(new EnvironmentHandler());
    loadJobHandlers.push(new ApplicationHandlerV4());
    loadJobHandlers.push(new DatabaseHandler());
    loadJobHandlers.push(new TerraformModuleHandler());
    loadJobHandlers.push(new KubernetesHandler());
    loadJobHandlers.push(new ElasticacheRedisHandler());
    loadJobHandlers.push(new UtopiopsApplicationHandler());
    // loadJobHandlers.push(new AwsK8sMongoDbHandler());
}
exports.dispatchJob = async (jobType, jobDetail, jobPath = '') => {
    // Update the job status
    const jobId = jobDetail.jobId;
    const user = userHelper.getUserFromJobDetails(jobDetail);
    const success = await jobService.notifyJobPicked(user, jobId);
    if (success) {
        logger.verbose(`notifyJobPicked done: ${jobId}`)
        var handlers = loadJobHandlers.filter(handler => handler.canHandle(jobType, jobPath));
        await Promise.all(handlers.map(async h => h.handle(jobDetail, jobPath)));    
    } else {
        logger.verbose(`notifyJobPicked failed: ${jobId}`)
        throw(new Error("cannot process the job"));
    }
}
