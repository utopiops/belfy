const constants             = require('../../shared/constants');
const userHelper            = require('../../shared/user.helper')
const JobService            = require('../../services/job')
const {
  deployApplication: deployUtopiopsStaticWebsite,
  destroyApplication: destroyUtopiopsStaticWebsite
} = require('./staticWebsite');
const {
  deployDomain: deployDomain,
  destroyDomain: destroyDomain,
  dryRunDomain: dryRunDomain
} = require('./domain');

const logger = require('../../shared/logger');

const jobService = new JobService();

const supportedJobs = [
  constants.jobPaths.deployUtopiopsStaticWebsite,
  constants.jobPaths.destroyUtopiopsStaticWebsite,
  constants.jobPaths.deployDomain,
  constants.jobPaths.destroyDomain,
  constants.jobPaths.dryRunDomain,
]

class UtopiopsApplicationHandler {
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
        case constants.jobPaths.deployUtopiopsStaticWebsite:
          await deployUtopiopsStaticWebsite(jobDetails);
          break;
        case constants.jobPaths.destroyUtopiopsStaticWebsite:
          await destroyUtopiopsStaticWebsite(jobDetails);
          break;
        case constants.jobPaths.deployDomain:
          await deployDomain(jobDetails);
          break;
        case constants.jobPaths.destroyDomain:
          await destroyDomain(jobDetails);
          break;
        case constants.jobPaths.dryRunDomain:
          await dryRunDomain(jobDetails);
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

module.exports = UtopiopsApplicationHandler;