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

  const providerModulePath = './terraform-modules/aws/classic-baked-v3';
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

  // We remove from details properties that have null or undefined value
  // In these cases terraform default value will set 
  const antiNullApp = _(details).omitBy(_.isUndefined).omitBy(_.isNull).value()

  const image_id = (details.runtime_variables && details.runtime_variables.image_id) ?
    details.runtime_variables.image_id :
    antiNullApp.image_id

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
      alb_exposed_ports: JSON.stringify(antiNullApp.alb_exposed_ports || []).replace(/":/g, '"='),
      nlb_exposed_ports: JSON.stringify(antiNullApp.nlb_exposed_ports || []).replace(/":/g, '"='),
      instance_groups: JSON.stringify(antiNullApp.instance_groups || []).replace(/":/g, '"='),
      instance_iam_role: antiNullApp.instance_iam_role,
      image_id,
      base64encoded_user_data: antiNullApp.base64encoded_user_data,
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
