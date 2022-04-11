"use strict"
const logger = require("../../shared/logger");
const processHelper = require('../../infrastructure-worker/common/process-helper');
const { providerTerraformState, updateProviderStatusToDestroyed, updateProviderStatus } = require('./helper');
const config = require("../../config");
const fileHelper = require('../../infrastructure-worker/common/file-helper');
const constants = require("../../shared/constants");



module.exports = {
  createProvider,
  destroyProvider,
};

const getRootFolderPath = (jobDetails) => `${config.userInfRootPath}/user-infrastructure/${jobDetails.accountId}/${jobDetails.jobId}`;

async function createProvider(jobDetails) {
  try {
    const kmsKeyId = await prepAndRunProviderTf(jobDetails, getRootFolderPath(jobDetails), "apply")
    updateProviderStatus(jobDetails, {
      status: constants.resourceStatus.deployed,
      kmsKeyId
  });
  } catch (error) {
    console.log(error);
    updateProviderStatus(jobDetails, {
      status: constants.resourceStatus.deployFailed,
    });
  }
}
async function destroyProvider(jobDetails) {
  try {
    await prepAndRunProviderTf(jobDetails, getRootFolderPath(jobDetails), "destroy");
    await updateProviderStatusToDestroyed(jobDetails);
  } catch (error) {
    console.log(error);
    updateProviderStatus(jobDetails, {
      status: constants.resourceStatus.destroyFailed,
    });
  }
}

async function prepAndRunProviderTf(jobDetails, rootFolderPath, action) {
  const { accountId, userId, details } = jobDetails;
  const { displayName, credentials } = details;

  await fileHelper.deleteFolder(rootFolderPath);
  logger.verbose(`rootFolderPath: ${rootFolderPath}`);

  const providerModulePath = './terraform-modules/aws/provider';
  await fileHelper.copyFolder(providerModulePath, rootFolderPath);

  const runTerraformOptions = {
    id: userId,
    accountId,
    credentials,
    action,
    tfVars: {
      region: jobDetails.details.region,
      bucket_name: jobDetails.details.bucketName,
      table_name: jobDetails.details.dynamodbName,
    }
  }

  // parameters required to store/retrieve the terraform state on/from S3
  const tfStateParams = {
    region: config.tfS3Region,
    bucketName: config.providerTfS3Bucket,
    key: details.stateKey
  }

  if (action === "destroy") {
    const result = await providerTerraformState(tfStateParams, rootFolderPath, "download")
    if (!result.success) console.log(result.message)
  }

  try {
    logger.verbose(`RunTerraform options: ${JSON.stringify(runTerraformOptions, null, 2)}`)
    await processHelper.runTerraform(rootFolderPath, runTerraformOptions);
  } catch (error) {
    const result = await providerTerraformState(tfStateParams, rootFolderPath, "upload")
    if (!result.success) console.log(result.message)
    throw new Error(error)
  }

  let kmsKeyId

  if (action === "apply") {
    const result = await providerTerraformState(tfStateParams, rootFolderPath, "upload")
    if (!result.success) console.log(result.message)

    kmsKeyId = await processHelper.getSingleTerraformOutputV2(rootFolderPath, runTerraformOptions, 'kms_key_id');
  } else if (action === "destroy") {
    await providerTerraformState(tfStateParams, rootFolderPath, "delete")
  }

  // await fileHelper.deleteFolder(rootFolderPath); // this is to make sure we don't fill up the disk
  logger.verbose(`deleted rootFolderPath: ${rootFolderPath}`);

  return kmsKeyId
}
