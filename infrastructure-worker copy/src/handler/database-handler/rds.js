"use strict"
const logger = require("../../shared/logger");
const processHelper = require('../../infrastructure-worker/common/process-helper');
const config = require("../../config");
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const _ = require('lodash');
const UserApplicationService = require('../../services/user-application');

const userApplicationService = new UserApplicationService();

module.exports = {
  deployDatabase,
  destroyDatabase,
  dryRunDatabase
};

const getRootFolderPath = (jobDetails) => `${config.userInfRootPath}/user-infrastructure/${jobDetails.accountId}/${jobDetails.jobId}`;

async function deployDatabase(jobDetails) {
  try {
    await prepAndRunDatabaseTf(jobDetails, getRootFolderPath(jobDetails), "apply");
    await userApplicationService.setEnvironmentDatabaseV2DeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.name, 'deployed', jobDetails.jobId);
  } catch (e) {
    console.log(e);
    await userApplicationService.setEnvironmentDatabaseV2DeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.name, 'deploy_failed', jobDetails.jobId);
  }
}
async function destroyDatabase(jobDetails) {
  try {
    await prepAndRunDatabaseTf(jobDetails, getRootFolderPath(jobDetails), "destroy");
    await userApplicationService.setEnvironmentDatabaseV2DeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.name, 'destroyed', jobDetails.jobId);
  } catch (e) {
    console.log(e);
    await userApplicationService.setEnvironmentDatabaseV2DeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.name, 'destroy_failed', jobDetails.jobId);
  }
}
async function dryRunDatabase (jobDetails) {
  try {
    await prepAndRunDatabaseTf(jobDetails, getRootFolderPath(jobDetails), "plan");
  } catch (e) {
    console.log(e);
    // todo: ok now what?!
  }
}

async function prepAndRunDatabaseTf(jobDetails, rootFolderPath, action) {
  const { accountId, userId, jobId, details } = jobDetails;
  const { credentials, providerDetails } = details;

  logger.verbose(`rootFolderPath: ${rootFolderPath}`);

  const providerModulePath = './terraform-modules/aws/rds-v3';
  await fileHelper.copyFolder(providerModulePath, rootFolderPath);

  const stateKey = `utopiops-water/applications/environment/${jobDetails.details.environmentName}/database/${jobDetails.details.name}`; // TODO: This must be unique, somehow centralize it

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

  if (['sqlserver-ee', 'sqlserver-se', 'sqlserver-ex', 'sqlserver-web'].includes(details.engine)) {
    details.initial_db_name = null
    details.license_model = "license-included"
  }

  // We remove properties that have null or undefined value from details 
  // In these cases terraform's default value will set 
  const antiNullDatabase = _(details).omitBy(_.isUndefined).omitBy(_.isNull).value()

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
      name: antiNullDatabase.name,
      environment: jobDetails.details.environmentName,
      environment_state: JSON.stringify(environmentState).replace(/":/g, '"='),
      allocated_storage: antiNullDatabase.allocated_storage,
      storage_type: antiNullDatabase.storage_type,
      engine: antiNullDatabase.engine,
      family: antiNullDatabase.family,
      engine_version: antiNullDatabase.engine_version,
      instance_class: antiNullDatabase.instance_class,
      initial_db_name: antiNullDatabase.initial_db_name,
      username: antiNullDatabase.username,
      password: antiNullDatabase.password,
      port: antiNullDatabase.port,
      multi_az: antiNullDatabase.multi_az,
      iops: antiNullDatabase.iops,
      publicly_accessible: antiNullDatabase.publicly_accessible,
      allow_major_version_upgrade: antiNullDatabase.allow_major_version_upgrade,
      auto_minor_version_upgrade: antiNullDatabase.auto_minor_version_upgrade,
      apply_immediately: antiNullDatabase.apply_immediately,
      maintenance_window: antiNullDatabase.maintenance_window,
      backup_retention_period: antiNullDatabase.backup_retention_period,
      backup_window: antiNullDatabase.backup_window,
      performance_insights_enabled: antiNullDatabase.performance_insights_enabled,
      license_model: antiNullDatabase.license_model,
      tags: JSON.stringify(antiNullDatabase.tags || {}).replace(/":/g, '"='),
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
