const constants             = require('../../shared/constants');
const userHelper            = require('../../shared/user.helper')
const JobService            = require('../../services/job')
const logger = require('../../shared/logger');
const {
  deployEnvironment: deployAwsEnvironment,
  destroyEnvironment: destroyAwsEnvironment,
  dryRunEnvironment: dryRunAwsEnvironment
} = require('./awsEnvironment');
const {
  deployEnvironment: deployAzureEnvironment,
  destroyEnvironment: destroyAzureEnvironment,
  dryRunEnvironment: dryRunAzureEnvironment
} = require('./azureEnvironment');
const {
  deployEnvironment: deployGcpEnvironment,
  destroyEnvironment: destroyGcpEnvironment,
  dryRunEnvironment: dryRunGcpEnvironment
} = require('./gcpEnvironment');


const jobService = new JobService();

const supportedJobs = [
  constants.jobPaths.deployAwsEnvironmentV4,
  constants.jobPaths.destroyAwsEnvironmentV4,
  constants.jobPaths.dryRunAwsEnvironmentV4,
  constants.jobPaths.dryRunAzureEnvironment,
  constants.jobPaths.deployAzureEnvironment,
  constants.jobPaths.destroyAzureEnvironment,
  constants.jobPaths.dryRunGcpEnvironment,
  constants.jobPaths.deployGcpEnvironment,
  constants.jobPaths.destroyGcpEnvironment,
]

class EnvironmentHandler {
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
        case constants.jobPaths.deployAwsEnvironmentV4:
          await deployAwsEnvironment(jobDetails);
          break;
        case constants.jobPaths.destroyAwsEnvironmentV4:
          await destroyAwsEnvironment(jobDetails);
          break;
        case constants.jobPaths.dryRunAwsEnvironmentV4:
          await dryRunAwsEnvironment(jobDetails);
          break;
        case constants.jobPaths.deployAzureEnvironment:
          await deployAzureEnvironment(jobDetails);
          break;
        case constants.jobPaths.destroyAzureEnvironment:
          await destroyAzureEnvironment(jobDetails);
          break;
        case constants.jobPaths.dryRunAzureEnvironment:
          await dryRunAzureEnvironment(jobDetails);
          break;
        case constants.jobPaths.deployGcpEnvironment:
          await deployGcpEnvironment(jobDetails);
          break;
        case constants.jobPaths.destroyGcpEnvironment:
          await destroyGcpEnvironment(jobDetails);
          break;
        case constants.jobPaths.dryRunGcpEnvironment:
          await dryRunGcpEnvironment(jobDetails);
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

module.exports = EnvironmentHandler;