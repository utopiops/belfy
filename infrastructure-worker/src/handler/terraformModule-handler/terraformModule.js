"use strict"
const constants = require('../../shared/constants');
const logger = require("../../shared/logger");
const processHelper = require('../../infrastructure-worker/common/process-helper');
const config = require("../../config");
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const UserApplicationService = require('../../services/user-application');

const userApplicationService = new UserApplicationService();

module.exports = {
  deployTerraformModule,
  destroyTerraformModule,
  dryRunTerraformModule
};

const getRootFolderPath = (jobDetails) => `${config.userInfRootPath}/user-infrastructure/${jobDetails.accountId}/${jobDetails.jobId}`;

async function deployTerraformModule(jobDetails) {
  try {
    await prepAndRunTerraformModule(jobDetails, getRootFolderPath(jobDetails), "apply");
    await userApplicationService.setTerraformModuleDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.tfModuleName, 'deployed', jobDetails.jobId);
  } catch (e) {
    console.log(e);
    await userApplicationService.setTerraformModuleDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.tfModuleName, 'deploy_failed', jobDetails.jobId);
  }
}
async function destroyTerraformModule(jobDetails) {
  try {
    await prepAndRunTerraformModule(jobDetails, getRootFolderPath(jobDetails), "destroy");
    await userApplicationService.setTerraformModuleDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.tfModuleName, 'destroyed', jobDetails.jobId);
  } catch (e) {
    console.log(e);
    await userApplicationService.setTerraformModuleDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.tfModuleName, 'destroy_failed', jobDetails.jobId);
  }
}
async function dryRunTerraformModule(jobDetails) {
  try {
    await prepAndRunTerraformModule(jobDetails, getRootFolderPath(jobDetails), "plan");
  } catch (e) {
    console.log(e);
    // todo: ok now what?!
  }
}

async function prepAndRunTerraformModule(jobDetails, rootFolderPath, action) {
  const { accountId, userId, jobId, details } = jobDetails;
  const { credentials, providerDetails, token } = details;

  logger.verbose(`rootFolderPath: ${rootFolderPath}`);

  const providerModulePath = './terraform-modules/aws/terraform-module';
  await fileHelper.copyFolder(providerModulePath, rootFolderPath);

  const environmentState = {
    bucket: providerDetails.bucketName,
    region: providerDetails.region,
    key: `utopiops-water/applications/environment/${jobDetails.details.environmentName}`
  }

  const stateKey = `utopiops-water/applications/environment/${jobDetails.details.environmentName}/terraform_module/${jobDetails.details.tfModuleName}`; // TODO: This must be unique, somehow centralize it

  const backend = {
    region: providerDetails.region,
    bucket: providerDetails.bucketName,
    kms_key_id: providerDetails.kmsKeyId,
    dynamodb_table: providerDetails.dynamodbName,
    key: stateKey
  }

  // Cloning remote repository
  let repositoryUrl = details.repositoryUrl

  if (token) {
    switch (details.gitService) {
      case constants.integrationServices.gitlab:
        repositoryUrl = `https://gitlab-ci-token:${token}@${repositoryUrl.substring(repositoryUrl.indexOf('gitlab.com'))}`
        break;
      case constants.integrationServices.github:
        repositoryUrl = `https://${token}:x-oauth-basic@${repositoryUrl.substring(repositoryUrl.indexOf('github.com'))}`
        break;
      case constants.integrationServices.bitBucket:
        repositoryUrl = `https://x-token-auth:${token}@${repositoryUrl.substring(repositoryUrl.indexOf('bitbucket.org'))}`
        break;
    }
  }

  const cloneRepositoryCommand = ['clone', repositoryUrl, 'repository']

  if (details.release) { // If release exists, clone specific version
    cloneRepositoryCommand.push('--branch')
    cloneRepositoryCommand.push(details.release)
  }

  await processHelper.childExecute('git', cloneRepositoryCommand, {
    cwd: rootFolderPath,
    detached: true,
    shell: true
  }, jobId, { id: userId, accountId });

  await fileHelper.copyFolder(`${rootFolderPath}/repository`, rootFolderPath);
  await fileHelper.deleteFolder(`${rootFolderPath}/repository`);
  // Writing user terraform code in utopiops_water_init.tf 
  if (details.code) {
    await fileHelper.writeToFile(`${rootFolderPath}/utopiops_water_init.tf`, details.code)
  }

  const tfVars = {}
  details.tfVars.forEach((v) => {
    tfVars[v.key] = v.value
  })

  const runTerraformOptions = {
    id: userId,
    accountId,
    jobId,
    credentials,
    action,
    withBackend: true,
    backend,
    tfVars: { // todo: add terraform files to use tfVars
      environment: details.environmentName,
      environment_state: JSON.stringify(environmentState).replace(/":/g, '"='),
      ...tfVars
    },
    unlock: {
      enabled: true,
      region: providerDetails.region,
      bucketName: providerDetails.bucketName,
      dynamodbName: providerDetails.dynamodbName,
      stateKey
    }
  }

  logger.verbose(`RunTerraform options: ${JSON.stringify(runTerraformOptions, null, 2)}`)
  await processHelper.runTerraform(rootFolderPath, runTerraformOptions);

  await fileHelper.deleteFolder(rootFolderPath); // this is to make sure we don't fill up the disk
  logger.verbose(`deleted rootFolderPath: ${rootFolderPath}`);
}
