const constants             = require('../../shared/constants');
const userHelper            = require('../../shared/user.helper')
const JobService            = require('../../services/job')
const {
  deployCluster: deployEksCluster,
  destroyCluster: destroyEksCluster,
  dryRunCluster: dryRunEksCluster
} = require('./eksCluster');

const logger = require('../../shared/logger');

const jobService = new JobService();

const supportedJobs = [
  constants.jobPaths.deployKubernetesEksCluster,
  constants.jobPaths.destroyKubernetesEksCluster,
  constants.jobPaths.dryRunKubernetesEksCluster,
]

class KubernetesHandler {
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
        case constants.jobPaths.deployKubernetesEksCluster:
          await deployEksCluster(jobDetails);
          break;
        case constants.jobPaths.destroyKubernetesEksCluster:
          await destroyEksCluster(jobDetails);
          break;
        case constants.jobPaths.dryRunKubernetesEksCluster:
          await dryRunEksCluster(jobDetails);
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

module.exports = KubernetesHandler;