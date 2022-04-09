const AWS = require('aws-sdk');
const constants = require('../../shared/constants');
const config = require('../../config');
const JobService = require('../../services/job');
const userHelper = require('../../shared/user.helper');
const LogmetricService = require('../../services/logmetric');
const UserApplicationService = require('../../services/user-application');
const processHelper = require('../../infrastructure-worker/common/process-helper');
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const { renderTerraform: renderEnvironmentAlarm } = require('./environmentAlarmResourceHelper');
const { renderTerraform: renderApplicationAlarm } = require('./applicationAlarmResourceHelper');

const jobService = new JobService();

const logmetricService = new LogmetricService();
const userApplicationService = new UserApplicationService();

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
  constants.jobPaths.deployApplicationAlarmCloudWatch,
  constants.jobPaths.destroyApplicationAlarmCloudWatch,
  constants.jobPaths.deployEnvironmentAlarmCloudWatch,
  constants.jobPaths.destroyEnvironmentAlarmCloudWatch,
];

class AlarmHandler {
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
    console.log(`jobPath is: ${jobPath}`);
    // TODO: Each case should return a status to be used in the job status update (complete -> successful/failed)
    switch (jobPath) {
      case constants.jobPaths.deployApplicationAlarmCloudWatch:
        await this.deployApplicationAlarmCloudWatch(jobDetails);
        break;
      case constants.jobPaths.destroyApplicationAlarmCloudWatch:
        await this.destroyApplicationAlarmCloudWatch(jobDetails);
        break;
      case constants.jobPaths.deployEnvironmentAlarmCloudWatch:
        await this.deployEnvironmentAlarmCloudWatch(jobDetails);
        break;
      case constants.jobPaths.destroyEnvironmentAlarmCloudWatch:
        await this.destroyEnvironmentAlarmCloudWatch(jobDetails);
        break;
    }
    const jobId = jobDetails.jobId;
    const user = userHelper.getUserFromJobDetails(jobDetails);
    // await jobService.notifyJobDone(user, jobId);
  }


  deployApplicationAlarmCloudWatch = async (jobDetails) => {
    // todo: check if we update the job status, if not do it!
    const alarm = jobDetails.details.alarm;
    try {
      await this.prepAndRunApplicationAlarmTf(jobDetails, 'apply');
      const jobResult = {
        jobId: jobDetails.jobId,
        success: true
      }
      console.log(`jobResult: `, jobResult);
      await logmetricService.sendApplicationAlarmDeploymentResult({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.applicationName, alarm.name, {jobResult});
    } catch (e) {
      console.log(e);
      const jobResult = {
        jobId: jobDetails.jobId,
        success: false,
        reason: e.message
      }
      console.log(`jobResult: `, jobResult);
      await logmetricService.sendApplicationAlarmDeploymentResult({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.applicationName, alarm.name, {jobResult});
    }
  }
 
  destroyApplicationAlarmCloudWatch = async (jobDetails) => {
    // todo: check if we update the job status, if not do it!
    const alarm = jobDetails.details.alarm;
    try {
      await this.prepAndRunApplicationAlarmTf(jobDetails, 'destroy');
      const jobResult = {
        jobId: jobDetails.jobId,
        success: true
      }
      console.log(`jobResult: `, jobResult);
      await logmetricService.sendApplicationAlarmDestroyResult({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.applicationName, alarm.name, {jobResult});
    } catch (e) {
      console.log(e);
      const jobResult = {
        jobId: jobDetails.jobId,
        success: false,
        reason: e.message
      }
      console.log(`jobResult: `, jobResult);
      await logmetricService.sendApplicationAlarmDestroyResult({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.applicationName, alarm.name, {jobResult});
    }
  }


  deployEnvironmentAlarmCloudWatch = async (jobDetails) => {
    // todo: check if we update the job status, if not do it!
    const alarm = jobDetails.details.alarm;
    try {
      await this.prepAndRunEnvironmentAlarmTf(jobDetails, 'apply');
      const jobResult = {
        jobId: jobDetails.jobId,
        success: true
      }
      console.log(`jobResult: `, jobResult);
      await logmetricService.sendEnvironmentAlarmDeploymentResult({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, alarm.name, {jobResult});
    } catch (e) {
      console.log(e);
      const jobResult = {
        jobId: jobDetails.jobId,
        success: false,
        reason: e.message
      }
      console.log(`jobResult: `, jobResult);
      await logmetricService.sendEnvironmentAlarmDeploymentResult({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, alarm.name, {jobResult});
    }
  }

  destroyEnvironmentAlarmCloudWatch = async (jobDetails) => {
    // todo: check if we update the job status, if not do it!
    const alarm = jobDetails.details.alarm;
    try {
      await this.prepAndRunEnvironmentAlarmTf(jobDetails, 'destroy');
      const jobResult = {
        jobId: jobDetails.jobId,
        success: true
      }
      await logmetricService.sendEnvironmentAlarmDestroyResult({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, alarm.name, {jobResult});
    } catch (e) {
      console.log(e);
      const jobResult = {
        jobId: jobDetails.jobId,
        success: false,
        reason: e.message
      }
      await logmetricService.sendEnvironmentAlarmDestroyResult({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, alarm.name, {jobResult});
    }
  }


  prepAndRunEnvironmentAlarmTf = async (jobDetails, action) => {
    // const tfSourceExistsOnS3 = this.getTerraformSourceFromS3(); // todo: use this and decide based on tfSourceExistsOnS3. atm we always create TF

    //render terraform
    const accountId = jobDetails.accountId;
    const userId = jobDetails.userId;
    const alarm = jobDetails.details.alarm;
    const rootFolderPath = `/tmp/${jobDetails.accountId}/${jobDetails.userId}/alarm/environment/${jobDetails.details.environmentName}/${alarm.name}`
    const environment = await userApplicationService.getEnvironmentDetails({ id: userId, accountId }, jobDetails.details.environmentName);
    const stateKey = `alarms/environment/${jobDetails.details.environmentName}/${alarm.name}`; // TODO: This must be unique, somehow centralize it
    // Make sure the root folder (where the Terraform modules will build up) doesn't exist
    // Delete the user folder if it exists. This help in retries by avoiding unexpected behavior.
    await fileHelper.deleteFolder(rootFolderPath);

    await fileHelper.createFolder(rootFolderPath);

    const providerDetails = jobDetails.details.provider.backend;
    const params = {
      region: providerDetails.region,
      bucketName: providerDetails.bucketName,
      kmsKeyId: providerDetails.kmsKeyId,
      dynamodbName: providerDetails.dynamodbName,
      stateKey
    }
    await processHelper.initializeMainTerraformAws(params, rootFolderPath);
    const user = userHelper.getUserFromJobDetails(jobDetails);

    // These three variables are used in the ecs cluster to create top-level remote-state data sections
    const providerBucketName = params.bucketName;
    const providerRegion = params.region;

    await renderEnvironmentAlarm(rootFolderPath, environment, user, providerBucketName, providerRegion, alarm);
    console.log(`rootFolderPath: ${rootFolderPath}`);

    // todo: if tfSourceExistsOnS3 was false, zip the generated tf and copy to s3

    /// Run Terraform

    let runTerraformOptions = {
      id: userId,
      accountId: accountId,
      withBackend: true,
      jobId: jobDetails.jobId,
      action
    };


    await processHelper.runTerraform(rootFolderPath, runTerraformOptions);
  }
  
  prepAndRunApplicationAlarmTf = async (jobDetails, action) => {
    // const tfSourceExistsOnS3 = this.getTerraformSourceFromS3(); // todo: use this and decide based on tfSourceExistsOnS3. atm we always create TF

    //render terraform
    const accountId = jobDetails.accountId;
    const userId = jobDetails.userId;
    const alarm = jobDetails.details.alarm;
    const rootFolderPath = `/tmp/${jobDetails.accountId}/${jobDetails.userId}/alarm/environment/${jobDetails.details.environmentName}/application/${jobDetails.details.applicationName}/${alarm.name}`
    // const environment = await userApplicationService.getEnvironmentDetails({ id: userId, accountId }, jobDetails.details.environmentName);
    const stateKey = `alarms/environment/${jobDetails.details.environmentName}/${jobDetails.details.applicationName}/${alarm.name}`; // TODO: This must be unique, somehow centralize it
    // Make sure the root folder (where the Terraform modules will build up) doesn't exist
    // Delete the user folder if it exists. This help in retries by avoiding unexpected behavior.
    await fileHelper.deleteFolder(rootFolderPath);

    await fileHelper.createFolder(rootFolderPath);

    const providerDetails = jobDetails.details.provider.backend;
    const params = {
      region: providerDetails.region,
      bucketName: providerDetails.bucketName,
      kmsKeyId: providerDetails.kmsKeyId,
      dynamodbName: providerDetails.dynamodbName,
      stateKey
    }
    await processHelper.initializeMainTerraformAws(params, rootFolderPath);
    const user = userHelper.getUserFromJobDetails(jobDetails);

    // These three variables are used in the ecs cluster to create top-level remote-state data sections
    const providerBucketName = params.bucketName;
    const providerRegion = params.region;

    await renderApplicationAlarm(rootFolderPath, "environment", user, providerBucketName, providerRegion, alarm);
    console.log(`rootFolderPath: ${rootFolderPath}`);

    // todo: if tfSourceExistsOnS3 was false, zip the generated tf and copy to s3

    /// Run Terraform

    let runTerraformOptions = {
      id: userId,
      accountId: accountId,
      withBackend: true,
      jobId: jobDetails.jobId,
      action
    };


    await processHelper.runTerraform(rootFolderPath, runTerraformOptions);
  }








  //--------------------------------------- old




  getTerraformSourceFromS3 = async () => {
    // check if the terraform exists for this version on S3
    const s3 = this.getS3();
    const checkParams = {
      Bucket: config.tfS3Bucket,
      Key: 'test.txt'
    };
    let exists = true;
    try {
      const result = await s3.headObject(checkParams).promise();
      console.log(result);
    } catch (e) {
      if (e.code === 'NotFound') {
        exists = false;
      } else {
        throw e;
      }
    }

    console.log(exists);

    // if yes, download the tf files
    if (exists) {
      const copyParams = {
        ...checkParams

      };
      try {
        const result = await s3.getObject(copyParams).promise();
        console.log(result.Body.toString());
        // todo: unzip the result
        return true;
      } catch (e) {
        console.log(e);
      }
    } else {
      return false;
    }
  }

  getS3 = () => {
    AWS.config.update({
      region: config.tfS3Region,
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    });
    return new AWS.S3({
      apiVersion: '2016-11-15'
    });
  }

}

module.exports = AlarmHandler;