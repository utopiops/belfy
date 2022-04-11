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

  const applicationModulePath = './terraform-modules/azure/static_website';
  await fileHelper.copyFolder(applicationModulePath, rootFolderPath);

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
    resource_group_name: providerDetails.resourceGroupName,
    storage_account_name: providerDetails.storageAccountName,
    container_name: 'tfstate',
    key: stateKey
  }

  const environmentState = {
    resource_group_name: providerDetails.resourceGroupName,
    storage_account_name: providerDetails.storageAccountName,
    container_name: 'tfstate',
    key: `utopiops-water/applications/environment/${jobDetails.details.environmentName}`
  }

  details.release_version = (details.runtime_variables || {}).release_version
  // We remove from details properties that have null or undefined value
  // In these cases terraform default value will set 
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
      app_name,
      environment: jobDetails.details.environmentName,
      environment_state: JSON.stringify(environmentState).replace(/":/g, '"='),
      index_document: antiNullApp.index_document,
      error_document: antiNullApp.error_document,
      release_version: antiNullApp.release_version,
      disable_https: action === 'destroy' ? true : false
    }
  }
  await processHelper.runTerraform(rootFolderPath, runTerraformOptions);

  await fileHelper.deleteFolder(rootFolderPath); // this is to make sure we don't fill up the disk
  logger.verbose(`deleted rootFolderPath: ${rootFolderPath}`);
}
