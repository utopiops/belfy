const { handleRequest } = require("../../../helpers");
const { getEc2 } = require("./getEc2");
const { handleAwsRequest } = require("../helpers");

async function listEc2KeyPairsByEnvName(req, res) {
  const handle = async () => {
    const baseConfig = {
      credentials: res.locals.credentials,
      region: res.locals.provider.backend.region,
    };
    const ec2 = getEc2(baseConfig);

    const fn = () => ec2.describeKeyPairs({}).promise();
    return await handleAwsRequest({ fn });
  };
  const extractOutput = async (outputs) => {
    return outputs.KeyPairs.map((kp) => ({
      id: kp.KeyName,
      name: kp.KeyName,
    }));
  };
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listEc2KeyPairsByEnvName;
