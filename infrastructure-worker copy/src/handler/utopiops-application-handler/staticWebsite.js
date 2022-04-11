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
};

const getRootFolderPath = (jobDetails) => `${config.userInfRootPath}/user-infrastructure/${jobDetails.accountId}/${jobDetails.jobId}`;

async function deployApplication(jobDetails) {
  // todo: check if we update the job status, if not do it!
  const dynamicName = (jobDetails.details.runtime_variables || {}).dynamicName
  try {
    await prepAndRunApplicationTf(jobDetails, getRootFolderPath(jobDetails), "apply");
    await userApplicationService.setUtopiopsApplicationDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.name, 'deployed', jobDetails.jobId, dynamicName);
  } catch (e) {
    console.log(e);
    await userApplicationService.setUtopiopsApplicationDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.name, 'deploy_failed', jobDetails.jobId, dynamicName);
  }
}

async function destroyApplication(jobDetails) {
  // todo: check if we update the job status, if not do it!
  const dynamicName = (jobDetails.details.runtime_variables || {}).dynamicName
  try {
    await prepAndRunApplicationTf(jobDetails, getRootFolderPath(jobDetails), "destroy");
    await userApplicationService.setUtopiopsApplicationDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.name, 'destroyed', jobDetails.jobId, dynamicName);
  } catch (e) {
    console.log(e);
    await userApplicationService.setUtopiopsApplicationDeploymentState({ id: jobDetails.userId, accountId: jobDetails.accountId }, jobDetails.details.name, 'destroy_failed', jobDetails.jobId, dynamicName);
  }
}


async function prepAndRunApplicationTf(jobDetails, rootFolderPath, action) {
  const { accountId, userId, jobId, details } = jobDetails;

  logger.verbose(`rootFolderPath: ${rootFolderPath}`);

  const providerModulePath = './terraform-modules/aws/utopiops-s3-cloudfront-website-v3';
  await fileHelper.copyFolder(providerModulePath, rootFolderPath);

  const dynamicName = (details.variables || {}).dynamicName
  let stateKey
  let app_name = details.name

  if (dynamicName && details.isDynamicApplication) {
    stateKey = `utopiops-water/utopiops-applications/static-webstie/account/${jobDetails.accountId}/application/${details.name}/${dynamicName}`; // TODO: This must be unique, somehow centralize it
    app_name = `${app_name}-${dynamicName}`
  } else {
    stateKey = `utopiops-water/utopiops-applications/static-webstie/account/${jobDetails.accountId}/application/${details.name}`; // TODO: This must be unique, somehow centralize it
  }

  const backend = {
    region: config.utopiopsProviderRegion,
    bucket: config.utopiopsProviderBucket,
    kms_key_id: config.utopiopsProviderKmsKeyId,
    dynamodb_table: config.utopiopsProviderDynamodb,
    key: stateKey
  }

  const domainState = {
    bucket: config.utopiopsProviderBucket,
    region: config.utopiopsProviderRegion,
    key: `utopiops-water/utopiops-applications/domain/account/${jobDetails.accountId}/domain/${jobDetails.details.domainName}`
  }

  // We remove properties that have null or undefined value from details 
  // In these cases terraform's default value will set 
  const antiNullApp = _(details).omitBy(_.isUndefined).omitBy(_.isNull).value()

  const runTerraformOptions = {
    id: userId,
    accountId,
    jobId,
    credentials: {
      ...(process.env.isLocal ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      } : {})
    },
    action,
    withBackend: true,
    backend,
    tfVars: {
      app_name,
      domain_state: JSON.stringify(domainState).replace(/":/g, '"='),
      index_document: antiNullApp.index_document,
      error_document: antiNullApp.error_document,
      redirect_to_www: antiNullApp.redirect_to_www
    },
    unlock: {
      enabled: true,
      region: config.utopiopsProviderRegion,
      bucketName: config.utopiopsProviderBucket,
      dynamodbName: config.utopiopsProviderDynamodb,
      stateKey
    }
  }

  logger.verbose(`RunTerraform options: ${JSON.stringify(runTerraformOptions, null, 2)}`)
  await processHelper.runTerraform(rootFolderPath, runTerraformOptions);

  await fileHelper.deleteFolder(rootFolderPath); // this is to make sure we don't fill up the disk
  logger.verbose(`deleted rootFolderPath: ${rootFolderPath}`);
}
