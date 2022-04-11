"use strict"
const logger = require("../../shared/logger");
const processHelper = require('../../infrastructure-worker/common/process-helper');
const config = require("../../config");
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const _ = require('lodash');
const UserApplicationService = require('../../services/user-application');

const userApplicationService = new UserApplicationService();

module.exports = {
  deployApplication,
  destroyApplication,
  dryRunApplication
};

const getRootFolderPath = (jobDetails) => `${config.userInfRootPath}/user-infrastructure/${jobDetails.accountId}/${jobDetails.jobId}`;

async function deployApplication(jobDetails) {
  // todo: check if we update the job status, if not do it!
  const dynamicName = (jobDetails.details.runtime_variables || {}).dynamicName
  try {
    await prepAndRunApplicationTf(jobDetails, getRootFolderPath(jobDetails), "apply");
    await userApplicationService.setEnvironmentApplicationV2DeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.app_name, 'deployed', jobDetails.jobId, dynamicName);
  } catch (e) {
    console.log(e);
    await userApplicationService.setEnvironmentApplicationV2DeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.app_name, 'deploy_failed', jobDetails.jobId, dynamicName);
  }
}

async function destroyApplication(jobDetails) {
  // todo: check if we update the job status, if not do it!
  const dynamicName = (jobDetails.details.runtime_variables || {}).dynamicName
  try {
    await prepAndRunApplicationTf(jobDetails, getRootFolderPath(jobDetails), "destroy");
    await userApplicationService.setEnvironmentApplicationV2DeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.app_name, 'destroyed', jobDetails.jobId, dynamicName);
  } catch (e) {
    console.log(e);
    await userApplicationService.setEnvironmentApplicationV2DeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.app_name, 'destroy_failed', jobDetails.jobId, dynamicName);
  }
}

async function dryRunApplication (jobDetails) {
  try {
    await prepAndRunApplicationTf(jobDetails, getRootFolderPath(jobDetails), "plan");
  } catch (e) {
    console.log(`error`, e.message);
    console.log(e);
    // todo: ok now what?!
  }
}

async function prepAndRunApplicationTf(jobDetails, rootFolderPath, action) {
  const { accountId, userId, jobId, details } = jobDetails;
  const { credentials, providerDetails } = details;

  logger.verbose(`rootFolderPath: ${rootFolderPath}`);

  const providerModulePath = './terraform-modules/aws/ecs-service-v4';
  await fileHelper.copyFolder(providerModulePath, rootFolderPath);

  const dynamicName = (jobDetails.details.runtime_variables || {}).dynamicName
  let stateKey
  let app_name = details.app_name

  if (dynamicName && details.isDynamicApplication) {
    stateKey = `utopiops-water/applications/environment/${jobDetails.details.environmentName}/application/${jobDetails.details.app_name}/${dynamicName}`; // TODO: This must be unique, somehow centralize it
    app_name = `${app_name}-${dynamicName}`
  } else {
    stateKey = `utopiops-water/applications/environment/${jobDetails.details.environmentName}/application/${jobDetails.details.app_name}`; // TODO: This must be unique, somehow centralize it
  }

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

  // At this moment we pass ports of single-port apps to ports list
  // todo: remove this part after creating apps new version
  if (!details.containers[0].ports || details.containers[0].ports.length == 0) {
    details.containers[0].ports = [
      {
        containerPort: details.containers[0].containerPort,
        hostPort: details.containers[0].hostPort
      }
    ]
  }

  const container_tags = (details.runtime_variables || {}).container_tags
  // We remove properties that have null or undefined value from details 
  // In these cases terraform's default value will set 
  const antiNullApp = _(details).omitBy(_.isUndefined).omitBy(_.isNull).value()

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
      app_name,
      environment: antiNullApp.environmentName,
      environment_state: JSON.stringify(environmentState).replace(/":/g, '"='),
      containers: JSON.stringify(antiNullApp.containers || []).replace(/":/g, '"='),
      container_tags: JSON.stringify(container_tags || {}).replace(/":/g, '"='),
      ecs_cluster_name: antiNullApp.ecs_cluster_name,
      network_mode: antiNullApp.network_mode,
      memory: antiNullApp.memory,
      cpu: antiNullApp.cpu,
      exposed_container_name: antiNullApp.exposed_container_name,
      exposed_container_port: antiNullApp.exposed_container_port,
      certificate_arn: antiNullApp.certificate_arn,
      should_set_dns: antiNullApp.should_set_dns,
      task_role_arn: antiNullApp.task_role_arn,
      service_desired_count: antiNullApp.service_desired_count,
      health_check_path: antiNullApp.health_check_path,
      matcher: antiNullApp.matcher,
      deployment_minimum_healthy_percent: antiNullApp.deployment_minimum_healthy_percent,
      healthy_threshold: antiNullApp.healthy_threshold,
      unhealthy_threshold: antiNullApp.unhealthy_threshold,
      interval: antiNullApp.interval,
      timeout: antiNullApp.timeout,
      alb_name: antiNullApp.alb_name,
      alb_listener_port: antiNullApp.alb_listener_port,
      service_autoscaling: antiNullApp.service_autoscaling ? JSON.stringify(antiNullApp.service_autoscaling).replace(/":/g, '"=') : undefined,
      exposed_ports: JSON.stringify(antiNullApp.exposed_ports || []).replace(/":/g, '"=')
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
