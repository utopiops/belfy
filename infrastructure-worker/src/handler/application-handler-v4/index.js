const constants             = require('../../shared/constants');
const userHelper            = require('../../shared/user.helper')
const JobService            = require('../../services/job')
const {
  deployApplication: deployEcsApplication,
  destroyApplication: destroyEcsApplication,
  dryRunApplication: dryRunEcsApplication
} = require('./ecsApplication');
const {
  deployApplication: deployS3WebsiteApplication,
  destroyApplication: destroyS3WebsiteApplication,
  dryRunApplication: dryRunS3WebsiteApplication
} = require('./s3Website');
const {
  deployApplication: deployClassicBakedApplication,
  destroyApplication: destroyClassicBakedApplication,
  dryRunApplication: dryRunClassicBakedApplication
} = require('./classicBakedApplication');
const {
  deployApplication: deployAzureStaticWebsiteApplication,
  destroyApplication: destroyAzureStaticWebsiteApplication,
  dryRunApplication: dryRunAzureStaticWebsiteApplication
} = require('./azureStaticWebsite');

const logger = require('../../shared/logger');

const jobService = new JobService();

const supportedJobs = [
  constants.jobPaths.deployApplicationEcsV4,
  constants.jobPaths.destroyApplicationEcsV4,
  constants.jobPaths.dryRunApplicationEcsV4,
  constants.jobPaths.deployApplicationS3WebsiteV4,
  constants.jobPaths.destroyApplicationS3WebsiteV4,
  constants.jobPaths.dryRunApplicationS3WebsiteV4,
  constants.jobPaths.deployApplicationClassicBakedV4,
  constants.jobPaths.destroyApplicationClassicBakedV4,
  constants.jobPaths.dryRunApplicationClassicBakedV4,
  constants.jobPaths.deployApplicationAzureStaticWebsite,
  constants.jobPaths.destroyApplicationAzureStaticWebsite,
  constants.jobPaths.dryRunApplicationAzureStaticWebsite,
]

class ApplicationHandlerV4 {
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
    logger.verbose('jobDetails: %s', JSON.stringify(jobDetails));
    let jobResult;
    try {
      switch (jobPath) {
        case constants.jobPaths.deployApplicationEcsV4:
          await deployEcsApplication(jobDetails);
          break;
        case constants.jobPaths.destroyApplicationEcsV4:
          await destroyEcsApplication(jobDetails);
          break;
        case constants.jobPaths.dryRunApplicationEcsV4:
          await dryRunEcsApplication(jobDetails);
          break;
        case constants.jobPaths.deployApplicationS3WebsiteV4:
          await deployS3WebsiteApplication(jobDetails);
          break;
        case constants.jobPaths.destroyApplicationS3WebsiteV4:
          await destroyS3WebsiteApplication(jobDetails);
          break;
        case constants.jobPaths.dryRunApplicationS3WebsiteV4:
          await dryRunS3WebsiteApplication(jobDetails);
          break;
        case constants.jobPaths.deployApplicationClassicBakedV4:
          await deployClassicBakedApplication(jobDetails);
          break;
        case constants.jobPaths.destroyApplicationClassicBakedV4:
          await destroyClassicBakedApplication(jobDetails);
          break;
        case constants.jobPaths.dryRunApplicationClassicBakedV4:
          await dryRunClassicBakedApplication(jobDetails);
          break;
        case constants.jobPaths.deployApplicationAzureStaticWebsite:
          await deployAzureStaticWebsiteApplication(jobDetails);
          break;
        case constants.jobPaths.destroyApplicationAzureStaticWebsite:
          await destroyAzureStaticWebsiteApplication(jobDetails);
          break;
        case constants.jobPaths.dryRunApplicationAzureStaticWebsite:
          await dryRunAzureStaticWebsiteApplication(jobDetails);
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

module.exports = ApplicationHandlerV4;