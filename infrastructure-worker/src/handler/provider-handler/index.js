const constants             = require('../../shared/constants');
const userHelper            = require('../../shared/user.helper')
const JobService            = require('../../services/job')
const {
  createProvider: createAwsProvider,
  destroyProvider: destroyAwsProvider
} = require('./awsProvider');
const {
  createProvider: createAzureProvider,
  destroyProvider: destroyAzureProvider
} = require('./azureProvider');
const {
  createProvider: createDigitalOceanProvider,
  destroyProvider: destroyDigitalOceanProvider
} = require('./digitalOceanProvider');
const {
  createProvider: createGcpProvider,
  destroyProvider: destroyGcpProvider
} = require('./gcpProvider');
const {providerTerraformState} = require('./helper');
const logger = require('../../shared/logger');

const jobService = new JobService();

/*
Steps:
 Fetch the existing applications
 Select the working environment
 Add the environment resources
 Handle the new application
 Loop through the applications (only in the working environment) and call their handlers accordingly
 Run Terraform
 Post process the new application
 Merge the job's application with the environment and save the results in database
*/
const supportedJobs = [
  constants.jobPaths.createApplicationAwsProviderV2,
  constants.jobPaths.destroyApplicationAwsProviderV2,
  constants.jobPaths.createAzureProviderV2,
  constants.jobPaths.destroyAzureProviderV2,
  constants.jobPaths.createDigitalOceanProvider,
  constants.jobPaths.destroyDigitalOceanProvider,
  constants.jobPaths.createGcpProvider,
  constants.jobPaths.destroyGcpProvider,
]

class ApplicationHandler {
  canHandle = (jobType, jobPath) => {
    return supportedJobs.findIndex(path => path === jobPath) !== -1;
  }
  // TODO: Add exception handling
  /**
   * jobDetails: The information required to handle the job. The schema of the object is: 
   * {
   *  accountId: 'string',
   *  details: 'Object',
   *  extras: 'Object'
   * }
   */
  handle = async (jobDetails, jobPath) => {
    logger.verbose(`jobPath is: ${jobPath}`);
    let jobResult;
    try {
      switch (jobPath) {
        case constants.jobPaths.createApplicationAwsProviderV2:
          await createAwsProvider(jobDetails);
          break;
        case constants.jobPaths.destroyApplicationAwsProviderV2:
          await destroyAwsProvider(jobDetails);
          break;
        case constants.jobPaths.createAzureProviderV2:
          await createAzureProvider(jobDetails);
          break;
        case constants.jobPaths.destroyAzureProviderV2:
          await destroyAzureProvider(jobDetails);
          break;
        case constants.jobPaths.createDigitalOceanProvider:
          await createDigitalOceanProvider(jobDetails);
          break;
        case constants.jobPaths.destroyDigitalOceanProvider:
          await destroyDigitalOceanProvider(jobDetails);
          break;
        case constants.jobPaths.createGcpProvider:
          await createGcpProvider(jobDetails);
          break;
        case constants.jobPaths.destroyGcpProvider:
          await destroyGcpProvider(jobDetails);
          break;
      }
      jobResult = {
        success: true
      }
    } catch (e) {
      // todo: pass the reason for failure to the job
      console.log(e);
      jobResult = {
        success: false
      }
    } finally {
      const jobId = jobDetails.jobId;
      const user = userHelper.getUserFromJobDetails(jobDetails);
      await jobService.notifyJobDone(user, jobId, jobResult);
    } 
  }
}

module.exports = ApplicationHandler;