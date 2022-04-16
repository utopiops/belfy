const { handleRequest } = require("../helpers");
const { getS3: getS3 } = require("./getS3");
const { handleAwsRequest } = require("../infrastructure/aws/helpers");

async function listS3Objects(req, res) {
  const handle = async () => {
    const { environmentName, credentials } = res.locals;
    const { bucketName, region } = res.locals.provider.backend;
    const { applicationName } = req.params;
    const prefix = req.query.prefix;

    const baseConfig = {
      credentials,
      region,
    };

    const s3 = await getS3(baseConfig);
    // get the resources for this application
    const getObjParams = {
      Bucket: bucketName,
      Key: `utopiops-water/applications/environment/${environmentName}/application/${applicationName}`,
    };
    const getObjFn = () => s3.getObject(getObjParams).promise();
    const resp = await handleAwsRequest({ fn: getObjFn });
    if (!resp.success)
      return {
        success: false,
        error: {
          message: "This application doesn't exist or isn't deployed.",
          statusCode: 400,
        },
      };
    // get the objects list
    const state = JSON.parse(resp.outputs.Body.toString());
    const releaseBucket = state.outputs.release_bucket_name;
    if (!releaseBucket)
      return {
        success: false,
        error: {
          message: "No release bucket found for this application.",
          statusCode: 404,
        },
      };
    const params = {
      Bucket: releaseBucket.value,
      // if the 'prefix' query string was provided, get the content for that prefix
      // otherwise, get a list of prefixes
      ...(prefix ? { Prefix: prefix } : { Delimiter: "/" }),
    };
    const fn = () => s3.listObjectsV2(params).promise();
    return await handleAwsRequest({ fn });
  };
  const extractOutput = async (outputs) => {
    return outputs.Contents.length != 0
      ? outputs.Contents
      : outputs.CommonPrefixes;
  };
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listS3Objects;
