const { handleRequest } = require("../../../helpers");
const { getAutoScaling } = require("./getAutoScaling");
const { handleAwsRequest } = require("../helpers");
const yup = require("yup");

async function listAutoScalingGroupInstances(req, res) {
  const validationSchema = yup.object().shape({
    asgName: yup.string().required(),
  });
  const handle = async () => {
    const { asgName } = req.body
    const baseConfig = {
      credentials: res.locals.credentials,
      region: res.locals.provider.backend.region,
    };
    const autoScaling = await getAutoScaling(baseConfig);
    const params = {
      AutoScalingGroupNames: [asgName],
    };

    const fn = () => autoScaling.describeAutoScalingGroups(params).promise();
    return await handleAwsRequest({ fn });
  };
  const extractOutput = async (outputs) =>
    (outputs.AutoScalingGroups &&
      outputs.AutoScalingGroups[0] &&
      outputs.AutoScalingGroups[0].Instances) ||
    [];
  await handleRequest({ req, res, extractOutput, validationSchema, handle });
}

exports.handler = listAutoScalingGroupInstances;
