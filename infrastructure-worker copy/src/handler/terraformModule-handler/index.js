const constants             = require('../../shared/constants');
const userHelper            = require('../../shared/user.helper')
const JobService            = require('../../services/job')
const {
  deployTerraformModule,
  destroyTerraformModule,
  dryRunTerraformModule
} = require('./terraformModule');
const logger = require('../../shared/logger');

const jobService = new JobService();

const supportedJobs = [
  constants.jobPaths.deployTerraformModule,
  constants.jobPaths.destroyTerraformModule,
  constants.jobPaths.dryRunTerraformModule,
]

class TerraformModulesHandler {
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
        case constants.jobPaths.deployTerraformModule:
          await deployTerraformModule(jobDetails);
          break;
        case constants.jobPaths.destroyTerraformModule:
          await destroyTerraformModule(jobDetails);
          break;
        case constants.jobPaths.dryRunTerraformModule:
          await dryRunTerraformModule(jobDetails);
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

module.exports = TerraformModulesHandler;