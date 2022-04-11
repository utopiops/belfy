"use strict"
const logger = require("../../shared/logger");
const processHelper = require('../../infrastructure-worker/common/process-helper');
const config = require("../../config");
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const _ = require('lodash');
const UserApplicationService = require('../../services/user-application');

const userApplicationService = new UserApplicationService();

module.exports = {
  deployCluster,
  destroyCluster,
  dryRunCluster
};

const getRootFolderPath = (jobDetails) => `${config.userInfRootPath}/user-infrastructure/${jobDetails.accountId}/${jobDetails.jobId}`;

async function deployCluster(jobDetails) {
  // todo: check if we update the job status, if not do it!
  try {
    await prepAndRunKubernetesTf(jobDetails, getRootFolderPath(jobDetails), "apply");
    await userApplicationService.setKubernetesDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.eks_cluster_name, 'deployed', jobDetails.jobId);
  } catch (e) {
    console.log(e);
    await userApplicationService.setKubernetesDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.eks_cluster_name, 'deploy_failed', jobDetails.jobId);
  }
}

async function destroyCluster(jobDetails) {
  // todo: check if we update the job status, if not do it!
  try {
    await prepAndRunKubernetesTf(jobDetails, getRootFolderPath(jobDetails), "destroy");
    await userApplicationService.setKubernetesDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.eks_cluster_name, 'destroyed', jobDetails.jobId);
  } catch (e) {
    console.log(e);
    await userApplicationService.setKubernetesDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.eks_cluster_name, 'destroy_failed', jobDetails.jobId);
  }
}

async function dryRunCluster(jobDetails) {
  try {
    await prepAndRunKubernetesTf(jobDetails, getRootFolderPath(jobDetails), "plan");
  } catch (e) {
    console.log(`error`, e.message);
    console.log(e);
    // todo: ok now what?!
  }
}

async function prepAndRunKubernetesTf(jobDetails, rootFolderPath, action) {
  const { accountId, userId, jobId, details } = jobDetails;
  const { credentials, providerDetails } = details;

  logger.verbose(`rootFolderPath: ${rootFolderPath}`);

  const providerModulePath = './terraform-modules/aws/eks';
  await fileHelper.copyFolder(providerModulePath, rootFolderPath);

  const stateKey = `utopiops-water/kubernetesClusters/environment/${jobDetails.details.environmentName}/cluster/${jobDetails.details.eks_cluster_name}`; // TODO: This must be unique, somehow centralize it

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

  // We remove properties that have null or undefined value from details 
  // In these cases terraform's default value will set 
  const eks = _(details).omitBy(_.isUndefined).omitBy(_.isNull).value()

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
      eks_cluster_name: eks.eks_cluster_name,
      environment: eks.environmentName,
      environment_state: JSON.stringify(environmentState).replace(/":/g, '"='),
      worker_launch_template: eks.worker_launch_template ? JSON.stringify(eks.worker_launch_template).replace(/":/g, '"=') : null,
      instance_groups: JSON.stringify(eks.instance_groups || []).replace(/":/g, '"='),
      fargate_profiles: JSON.stringify(eks.fargate_profiles || []).replace(/":/g, '"='),
      tags: JSON.stringify(eks.tags || {}).replace(/":/g, '"='),
      eks_version: eks.eks_version,
      eks_endpoint_private_access: eks.eks_endpoint_private_access,
      eks_public_access: eks.eks_public_access,
      eks_enabled_cluster_log_types: JSON.stringify(eks.eks_enabled_cluster_log_types),
      eks_logs_retention_in_days: eks.eks_logs_retention_in_days,
      eks_worker_assume_role_arns: JSON.stringify(eks.eks_worker_assume_role_arns)
    },
    unlock: {
      enabled: true,
      region: providerDetails.region,
      bucketName: providerDetails.bucketName,
      dynamodbName: providerDetails.dynamodbName,
      stateKey
    },
  }

  if (action == 'destroy') {
    const targetOption = Object.assign({
      target: 'null_resource.delete_dependencies'
    }, runTerraformOptions)
    await processHelper.runTerraform(rootFolderPath, targetOption);
  }

  logger.verbose(`RunTerraform options: ${JSON.stringify(runTerraformOptions, null, 2)}`)
  await processHelper.runTerraform(rootFolderPath, runTerraformOptions);

  await fileHelper.deleteFolder(rootFolderPath); // this is to make sure we don't fill up the disk
  logger.verbose(`deleted rootFolderPath: ${rootFolderPath}`);
}
