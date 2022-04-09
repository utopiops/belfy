"use strict"
const logger = require("../../shared/logger");
const processHelper = require('../../infrastructure-worker/common/process-helper');
const config = require("../../config");
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const _ = require('lodash');
const UserApplicationService = require('../../services/user-application');

const userApplicationService = new UserApplicationService();

module.exports = {
  deployDomain,
  destroyDomain,
  dryRunDomain
};

const getRootFolderPath = (jobDetails) => `${config.userInfRootPath}/user-infrastructure/${jobDetails.accountId}/${jobDetails.jobId}`;

async function deployDomain(jobDetails) {
  try {
    await prepAndRunDomainTf(jobDetails, getRootFolderPath(jobDetails), "apply");
    await userApplicationService.setDomainDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.domainName, 'deployed', jobDetails.jobId);
  } catch (e) {
    console.log(e);
    await userApplicationService.setDomainDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.domainName, 'deploy_failed', jobDetails.jobId);
  }
}
async function destroyDomain(jobDetails) {
  try {
    await prepAndRunDomainTf(jobDetails, getRootFolderPath(jobDetails), "destroy");
    await userApplicationService.setDomainDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.domainName, 'destroyed', jobDetails.jobId);
  } catch (e) {
    console.log(e);
    await userApplicationService.setDomainDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.domainName, 'destroy_failed', jobDetails.jobId);
  }
}
async function dryRunDomain(jobDetails) {
  try {
    await prepAndRunDomainTf(jobDetails, getRootFolderPath(jobDetails), "plan");
  } catch (e) {
    console.log(e);
    // todo: ok now what?!
  }
}

async function prepAndRunDomainTf(jobDetails, rootFolderPath, action) {
  const { accountId, userId, jobId, details } = jobDetails;

  logger.verbose(`rootFolderPath: ${rootFolderPath}`);

  const providerModulePath = './terraform-modules/aws/domain';
  await fileHelper.copyFolder(providerModulePath, rootFolderPath);

  const stateKey = `utopiops-water/utopiops-applications/domain/account/${jobDetails.accountId}/domain/${details.domainName}`; // TODO: This must be unique, somehow centralize it

  const backend = {
    region: config.utopiopsProviderRegion,
    bucket: config.utopiopsProviderBucket,
    kms_key_id: config.utopiopsProviderKmsKeyId,
    dynamodb_table: config.utopiopsProviderDynamodb,
    key: stateKey
  }

  const runTerraformOptions = {
    id: userId,
    accountId,
    jobId,
    credentials: {
      ...(process.env.isLocal ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      } : {})
    },
    action,
    withBackend: true,
    backend,
    tfVars: {
      domain_name: details.domainName,
      create_certificate: details.createCertificate,
      account_id: jobDetails.accountId
    },
    unlock: {
      enabled: true,
      region: config.utopiopsProviderRegion,
      bucketName: config.utopiopsProviderBucket,
      dynamodbName: config.utopiopsProviderDynamodb,
      stateKey
    }
  }

  logger.verbose(`RunTerraform options: ${JSON.stringify(runTerraformOptions, null, 2)}`)
  await processHelper.runTerraform(rootFolderPath, runTerraformOptions);

  await fileHelper.deleteFolder(rootFolderPath); // this is to make sure we don't fill up the disk
  logger.verbose(`deleted rootFolderPath: ${rootFolderPath}`);
}
