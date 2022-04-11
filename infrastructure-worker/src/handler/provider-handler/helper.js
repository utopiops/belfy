const config = require("../../config");
const AWS                   = require('aws-sdk');
const tar                   = require('tar')
const fs                    = require('fs');
const AuthTokenHelper = require("../../shared/authToken.helper");
const userHelper            = require('../../shared/user.helper');
const HttpHelper = require("../../shared/http.helper");

module.exports = {
  updateProviderStatus,
  updateProviderStatusToDestroyed,
  providerTerraformState
}

async function updateProviderStatus(jobDetails, body) {
  const user = userHelper.getUserFromJobDetails(jobDetails);
  const token = await AuthTokenHelper.getToken();
  await new HttpHelper()
    .withAuth(token)
    .patch(`${config.apiUrl}/v3/provider/${jobDetails.details.name}/displayName/${jobDetails.details.displayName}/status?accountId=${user.accountId}&userId=${user.id}`, body);
}

async function updateProviderStatusToDestroyed(jobDetails) {
  const user = userHelper.getUserFromJobDetails(jobDetails);
  const token = await AuthTokenHelper.getToken();
  const body = {
    accountId: jobDetails.accountId,
    displayName: jobDetails.details.displayName
  }
  await new HttpHelper()
    .withAuth(token)
    .post(`${config.apiUrl}/v3/provider/displayName/${jobDetails.details.displayName}/destroyed?accountId=${user.accountId}&userId=${user.id}`, body);
}


async function providerTerraformState(options, path, action) {
  AWS.config.update({
    region: options.region,
    ...(process.env.isLocal ? {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    } : {})
  });
  const s3 = new AWS.S3({
    apiVersion: '2006-03-01'
  });

  try {
    if (action === "upload") {
      //steps:
      //1: compress the state file in key.tgz
      //2: upload key.tgz to S3 bucket
      const filePath = `${path}/${options.key}.tgz`
      await tar.create({
        file: filePath,
        cwd: path
      }, ['terraform.tfstate'])

      const fileStream = fs.createReadStream(filePath)
      const params = {
        Bucket: options.bucketName,
        Key: options.key + '.tgz',
        Body: fileStream,
      }
      await s3.upload(params).promise()
      console.log(`uploaded state ${params.Key} to S3`);
      return {
        success: true
      }
    } else if (action === "download") {
      //steps:
      //1: download key.tgz from S3 bucket
      //2: extract the state file from key.tgz
      const params = {
        Bucket: options.bucketName,
        Key: options.key + '.tgz'
      }
      const res = await s3.getObject(params).promise()
      console.log(`downloaded state ${params.Key} from S3`);
      const filePath = `${path}/${options.key}.tgz`
      fs.writeFileSync(filePath, res.Body)
      await tar.extract({
        file: filePath,
        cwd: path
      })
      return {
        success: true
      }
    } else if (action === "delete") {

      const params = {
        Bucket: options.bucketName,
        Key: options.key + '.tgz'
      }
      await s3.deleteObject(params).promise()
      console.log(`deleted state ${params.Key} from S3`);
      return {
        success: true
      }
    }
  } catch (error) {
    console.log(error)
    return {
      success: false,
      message: "error: Failed to access state on S3 bucket"
    }
  }
}