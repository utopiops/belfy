const { handleRequest } = require("../../../helpers");
const { getRds } = require("./getRds");
const { handleAwsRequest } = require("../helpers");
const yup = require('yup');

async function describeDbEngineVersions(req, res) {
  const validationSchema = yup.object().shape({
    Engine: yup.string().required()
  });
  const handle = async () => {
    const { Engine } = req.body
    const baseConfig = {
      credentials: res.locals.credentials,
      region: res.locals.provider.backend.region,
    };
    const rds = await getRds(baseConfig);

    const params = {
      Engine
    }

    const fn = () => rds.describeDBEngineVersions(params).promise();
    return await handleAwsRequest({ fn });
  };
  const extractOutput = async (outputs) => {
    return outputs.DBEngineVersions.map(v => {
      return {
        EngineVersion: v.EngineVersion,
        DBParameterGroupFamily: v.DBParameterGroupFamily
      }
    })
  };
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = describeDbEngineVersions;
