"use strict"
const logger = require("../../shared/logger");
const processHelper = require('../../infrastructure-worker/common/process-helper');
const config = require("../../config");
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const _ = require('lodash');
const EcrService = require('../../services/elasticache-redis');
const ecrService = new EcrService();

module.exports = {
  deployEcr,
  destroyEcr,
  dryRunEcr
};

const getRootFolderPath = (jobDetails) => `${config.userInfRootPath}/user-infrastructure/${jobDetails.accountId}/${jobDetails.jobId}`;

async function deployEcr(jobDetails) {
  // todo: check if we update the job status, if not do it!
  try {
    await prepAndRunEcrTf(jobDetails, getRootFolderPath(jobDetails), "apply");
    await ecrService.setEcrState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.display_name, "deployed", jobDetails.jobId);
  } catch (e) {
    console.log(e);
    await ecrService.setEcrState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.display_name, "deploy_failed", jobDetails.jobId);
  }
}

async function destroyEcr(jobDetails) {
  // todo: check if we update the job status, if not do it!
  try {
    await prepAndRunEcrTf(jobDetails, getRootFolderPath(jobDetails), "destroy");
    await ecrService.setEcrState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.display_name, "destroyed", jobDetails.jobId);
} catch (e) {
    console.log(e);
    await ecrService.setEcrState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.display_name, "destroy_failed", jobDetails.jobId);
}
}

async function dryRunEcr(jobDetails) {
  // todo: check if we update the job status, if not do it!
  try {
    await prepAndRunEcrTf(jobDetails, getRootFolderPath(jobDetails), "plan");
  } catch (e) {
    console.log(e);
  }
}

async function prepAndRunEcrTf(jobDetails, rootFolderPath, action) {
  const { accountId, userId, jobId, details } = jobDetails;
  const { credentials, providerDetails } = details;

  logger.verbose(`rootFolderPath: ${rootFolderPath}`);

  const providerModulePath = './terraform-modules/aws/elasticache-redis';
  await fileHelper.copyFolder(providerModulePath, rootFolderPath);

  const stateKey = `utopiops-water/elasticache/redis/environment/${jobDetails.details.environmentName}/${jobDetails.details.display_name}`; // TODO: This must be unique, somehow centralize it

  const backend = {
    region: providerDetails.region,
    bucket: providerDetails.bucketName,
    kms_key_id: providerDetails.kmsKeyId,
    dynamodb_table: providerDetails.dynamodbName,
    key: stateKey
  }

  const environmentState = {
    bucket: providerDetails.bucketName,
    region: providerDetails.region,
    key: `utopiops-water/applications/environment/${jobDetails.details.environmentName}`
  }

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
      environment: details.environmentName,
      display_name: details.display_name,
      environment_state: JSON.stringify(environmentState).replace(/":/g, '"='),
      engine_version: details.engine_version,
      node_type: details.node_type,
      is_cluster_mode_disabled: details.is_cluster_mode_disabled,
      number_cache_clusters: details.number_cache_clusters,
      replicas_per_node_group: details.replicas_per_node_group,
      num_node_groups: details.num_node_groups,
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
