const AWS = require('aws-sdk');
const constants = require('../../shared/constants');
const config = require('../../config');
const JobService = require('../../services/job');
const userHelper = require('../../shared/user.helper');
// const LogmetricService = require('../../services/logmetric');
const processHelper = require('../../infrastructure-worker/common/process-helper');
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const { renderTerraform: renderACMCertificate } = require('./awsAcmResourceHelper');
const sslTlsCertificateService = require('../../services/ssl-tls-certificate');

const jobService = new JobService();

// const logmetricService = new LogmetricService();


const supportedJobs = [
  constants.jobPaths.deployACMCertificateV2,
  constants.jobPaths.destroyACMCertificateV2,
];

class ACMCertificateHandlerV2 {
  canHandle = (jobType, jobPath) => {
    return supportedJobs.findIndex(path => path === jobPath) !== -1;
  }

  handle = async (jobDetails, jobPath) => {
    let jobResult;
    try {
      switch (jobPath) {
        case constants.jobPaths.deployACMCertificateV2:
          await this.deployACMCertificate(jobDetails);
          break;
        case constants.jobPaths.destroyACMCertificateV2:
          await this.destroyACMCertificate(jobDetails);
          break;
      }
      jobResult = {
        success: true
      }
    } catch (e) {
      // todo: pass the reason for failure to the job
      jobResult = {
        success: false
      }
    } finally {
      const jobId = jobDetails.jobId;
      const user = userHelper.getUserFromJobDetails(jobDetails);
      await jobService.notifyJobDone(user, jobId, jobResult);
    }
  }


  deployACMCertificate = async (jobDetails) => {
    // todo: check if we update the job status, if not do it!
    const alarm = jobDetails.details.alarm;
    try {
      await this.prepAndRunACMCertificateTf(jobDetails, 'apply');
      const jobResult = {
        jobId: jobDetails.jobId,
        success: true
      }
      console.log(`jobResult: `, jobResult);
      await sslTlsCertificateService.sendCertificateV2DeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.identifier, 'deployed', jobDetails.jobId);
    } catch (e) {
      console.error(e);
      const jobResult = {
        jobId: jobDetails.jobId,
        success: false,
        reason: e.message
      }
      console.log(`jobResult: `, jobResult);
      await sslTlsCertificateService.sendCertificateV2DeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.identifier, 'deploy_failed', jobDetails.jobId);
    }
  }

  destroyACMCertificate = async (jobDetails) => {
    // todo: check if we update the job status, if not do it!
    const alarm = jobDetails.details.alarm;
    try {
      await this.prepAndRunACMCertificateTf(jobDetails, 'destroy');
      const jobResult = {
        jobId: jobDetails.jobId,
        success: true
      }
      console.log(`jobResult: `, jobResult);
      await sslTlsCertificateService.sendCertificateV2DeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.identifier, 'destroyed', jobDetails.jobId);
    } catch (e) {
      console.log(e);
      const jobResult = {
        jobId: jobDetails.jobId,
        success: false,
        reason: e.message
      }
      console.log(`jobResult: `, jobResult);
      await sslTlsCertificateService.sendCertificateV2DeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.identifier, 'destroy_failed', jobDetails.jobId);
    }
  }

 

  prepAndRunACMCertificateTf = async (jobDetails, action) => {
    // const tfSourceExistsOnS3 = this.getTerraformSourceFromS3(); // todo: use this and decide based on tfSourceExistsOnS3. atm we always create TF

    //render terraform
    const accountId = jobDetails.accountId;
    const userId = jobDetails.userId;
    const certificate = jobDetails.details.certificate;
    const rootFolderPath = `/tmp/${jobDetails.accountId}/${jobDetails.userId}/cert/acm/env/${jobDetails.details.environmentName}/cert_id/${jobDetails.details.identifier}/${jobDetails.jobId}`
    const stateKey = `certificates/environment/${jobDetails.details.environmentName}/${jobDetails.details.identifier}`; // TODO: This must be unique, somehow centralize it
    
    // rootFolderPath is always unique cause it includes jobId
    await fileHelper.createFolder(rootFolderPath);

    const providerDetails = jobDetails.details.provider.backend;
    const params = {
      region: providerDetails.region,
      providerRegion: jobDetails.details.region, // this is for cloudfront certificate that only could be us-east-1
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

    await renderACMCertificate(rootFolderPath, jobDetails.details.environmentName, certificate);
    console.log(`rootFolderPath: ${rootFolderPath}`);

    // todo: if tfSourceExistsOnS3 was false, zip the generated tf and copy to s3

    /// Run Terraform

    let runTerraformOptions = {
      credentials: jobDetails.details.credentials,
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

module.exports = ACMCertificateHandlerV2;