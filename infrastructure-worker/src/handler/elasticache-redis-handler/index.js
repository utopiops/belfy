const constants             = require('../../shared/constants');
const userHelper            = require('../../shared/user.helper')
const JobService            = require('../../services/job')

const {
  deployEcr,
  destroyEcr,
  dryRunEcr,
} = require('./elasticacheRedis');


const logger = require('../../shared/logger');

const jobService = new JobService();

const supportedJobs = [
  constants.jobPaths.deployElasticacheRedis,
  constants.jobPaths.destroyElasticacheRedis,
  constants.jobPaths.dryRunElasticacheRedis,
]

class ElasticacheRedisHandler {
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
        case constants.jobPaths.deployElasticacheRedis:
          await deployEcr(jobDetails);
          break;
        case constants.jobPaths.destroyElasticacheRedis:
          await destroyEcr(jobDetails);
          break;
        case constants.jobPaths.dryRunElasticacheRedis:
          await dryRunEcr(jobDetails);
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

module.exports = ElasticacheRedisHandler;