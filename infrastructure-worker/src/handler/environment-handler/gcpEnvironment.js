"use strict"
const logger = require("../../shared/logger");
const processHelper = require('../../infrastructure-worker/common/process-helper');
const config = require("../../config");
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const _ = require('lodash');
const UserApplicationService = require('../../services/user-application');
const constants = require('../../shared/constants')

const userApplicationService = new UserApplicationService();

module.exports = {
  deployEnvironment,
  destroyEnvironment,
  dryRunEnvironment
};

const getRootFolderPath = (jobDetails) => `${config.userInfRootPath}/user-infrastructure/${jobDetails.accountId}/${jobDetails.jobId}`;

async function deployEnvironment(jobDetails) {
  try {
    await prepAndRunEnvironmentTf(jobDetails, getRootFolderPath(jobDetails), "apply");
    await userApplicationService.setEnvironmentV2DeploymentStatus({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, 'deployed', jobDetails.jobId);
  } catch (e) {
    console.log(e);
    await userApplicationService.setEnvironmentV2DeploymentStatus({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, 'deploy_failed', jobDetails.jobId);
  }
}
async function destroyEnvironment(jobDetails) {
  try {
    await prepAndRunEnvironmentTf(jobDetails, getRootFolderPath(jobDetails), "destroy");
    await userApplicationService.setEnvironmentV2DeploymentStatus({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, 'destroyed', jobDetails.jobId);
  } catch (e) {
    console.log(e);
    await userApplicationService.setEnvironmentV2DeploymentStatus({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, 'destroy_failed', jobDetails.jobId);
  }
}
async function dryRunEnvironment (jobDetails) {
  try {
    await prepAndRunEnvironmentTf(jobDetails, getRootFolderPath(jobDetails), "plan");
  } catch (e) {
    console.log(e);
    // todo: ok now what?!
  }
}

async function prepAndRunEnvironmentTf(jobDetails, rootFolderPath, action) {
  const { accountId, userId, jobId, details } = jobDetails;
  const { credentials, providerDetails } = details;

  logger.verbose(`rootFolderPath: ${rootFolderPath}`);

  const environmentModulePath = './terraform-modules/gcp/environment';
  await fileHelper.copyFolder(environmentModulePath, rootFolderPath);

  const backend = {
    bucket: providerDetails.bucketName,
    prefix: `utopiops-water/applications/environment/${jobDetails.details.environmentName}` // TODO: This must be unique, somehow centralize it
  }

  const antiNullEnv = _(details).omitBy(_.isUndefined).omitBy(_.isNull).value()

  const runTerraformOptions = {
    id: userId,
    accountId,
    jobId,
    credentials,
    action,
    withBackend: true,
    backend,
    tfVars: {
      environment: details.environmentName,
      dns: JSON.stringify(antiNullEnv.dns || {}).replace(/":/g, '"='),
      region: antiNullEnv.region,
      project_id: providerDetails.projectId
    }
  }

  logger.verbose(`RunTerraform options: ${JSON.stringify(runTerraformOptions, null, 2)}`)
  await processHelper.runTerraform(rootFolderPath, runTerraformOptions);

  await fileHelper.deleteFolder(rootFolderPath); // this is to make sure we don't fill up the disk
  logger.verbose(`deleted rootFolderPath: ${rootFolderPath}`);
}
