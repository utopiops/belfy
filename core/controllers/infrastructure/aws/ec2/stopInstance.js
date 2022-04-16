const { handleRequest } = require("../../../helpers");
const { getEc2 } = require("./getEc2");
const { handleAwsRequest } = require("../helpers");
const yup = require('yup');

async function stopInstance(req, res) {
  const validationSchema = yup.object().shape({
    instanceId: yup.string().required(),
  });
  const handle = async () => {
    const { instanceId } = req.body;
    const baseConfig = {
      credentials: res.locals.credentials,
      region: res.locals.provider.backend.region,
    };
    const ec2 = getEc2(baseConfig);
    const params = {
      InstanceIds: [instanceId],
    };

    const fn = () => ec2.stopInstances(params).promise();
    return await handleAwsRequest({ fn });
  };
  const extractOutput = async (outputs) => outputs;
  await handleRequest({ req, res, extractOutput, validationSchema, handle });
}

exports.handler = stopInstance;
