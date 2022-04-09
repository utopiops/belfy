"use strict"
const logger = require("../../shared/logger");
const processHelper = require('../../infrastructure-worker/common/process-helper');
const config = require("../../config");
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const _ = require('lodash');
const UserApplicationService = require('../../services/user-application');

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
    if (jobDetails.details.ecsClusterList && jobDetails.details.ecsClusterList.length > 0 ) {
      await prepAndRunEnvironmentTf(jobDetails, getRootFolderPath(jobDetails), "apply"); // todo: remove this when terraform fixes the bug of capacity
    }
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

  const providerModulePath = './terraform-modules/aws/environment';
  await fileHelper.copyFolder(providerModulePath, rootFolderPath);

  const stateKey = `utopiops-water/applications/environment/${jobDetails.details.environmentName}`; // TODO: This must be unique, somehow centralize it

  const backend = {
    region: providerDetails.region,
    bucket: providerDetails.bucketName,
    kms_key_id: providerDetails.kmsKeyId,
    dynamodb_table: providerDetails.dynamodbName,
    key: stateKey
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
      region: providerDetails.region,
      environment: jobDetails.details.environmentName,
      domain: JSON.stringify(jobDetails.details.domain || {}).replace(/":/g, '"='),
      albs: JSON.stringify(jobDetails.details.albList || []).replace(/":/g, '"='),
      nlbs: JSON.stringify(jobDetails.details.nlbList || []).replace(/":/g, '"='),
      ecs_clusters: JSON.stringify(jobDetails.details.ecsClusterList || []).replace(/":/g, '"='),
      alb_waf: antiNullEnv.alb_waf
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
