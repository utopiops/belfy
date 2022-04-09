"use strict"
const logger = require("../../shared/logger");
const processHelper = require('../../infrastructure-worker/common/process-helper');
const config = require("../../config");
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const _ = require('lodash');
const LogmetricService = require('../../services/logmetric');
const logmetricService = new LogmetricService();

module.exports = {
  deployAlarm,
  destroyAlarm,
};

const getRootFolderPath = (jobDetails) => `${config.userInfRootPath}/user-infrastructure/${jobDetails.accountId}/${jobDetails.jobId}`;

async function deployAlarm(jobDetails) {
  // todo: check if we update the job status, if not do it!
  try {
    await prepAndRunEnvironmentAlarmTf(jobDetails, getRootFolderPath(jobDetails), "apply");
    await logmetricService.setEnvironmentAlarmState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.alarmName, "deployed", jobDetails.jobId);
  } catch (e) {
    console.log(e);
    await logmetricService.setEnvironmentAlarmState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.alarmName, "deploy_failed", jobDetails.jobId);
  }
}

async function destroyAlarm(jobDetails) {
  // todo: check if we update the job status, if not do it!
  try {
    await prepAndRunEnvironmentAlarmTf(jobDetails, getRootFolderPath(jobDetails), "destroy");
    await logmetricService.setEnvironmentAlarmState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.alarmName, "destroyed", jobDetails.jobId);
} catch (e) {
    console.log(e);
    await logmetricService.setEnvironmentAlarmState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.environmentName, jobDetails.details.alarmName, "destroy_failed", jobDetails.jobId);
}
}

async function prepAndRunEnvironmentAlarmTf(jobDetails, rootFolderPath, action) {
  const { accountId, userId, jobId, details } = jobDetails;
  const { credentials, providerDetails } = details;

  logger.verbose(`rootFolderPath: ${rootFolderPath}`);

  const providerModulePath = './terraform-modules/aws/environment-cloudwatch-alarms';
  await fileHelper.copyFolder(providerModulePath, rootFolderPath);

  const stateKey = `utopiops-water/alarms/environment/${jobDetails.details.environmentName}/${jobDetails.details.alarmName}`; // TODO: This must be unique, somehow centralize it

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
  const antiNullAlarm = _(details).omitBy(_.isUndefined).omitBy(_.isNull).value()

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
      environment_state: JSON.stringify(environmentState).replace(/":/g, '"='),
      alarmType: antiNullAlarm.alarmType,
      alarmName: antiNullAlarm.alarmName,
      evaluationPeriods: antiNullAlarm.evaluationPeriods,
      period: antiNullAlarm.period,
      threshold: antiNullAlarm.threshold,
      albDisplayName: antiNullAlarm.albDisplayName,
      ecsClusterName: antiNullAlarm.ecsClusterName,
      endpoint: `${config.apiUrl}/v3/logmetric/alarm/environment/sns`
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
