const { handleRequest } = require("../../../helpers");
const { getIam } = require("./getIam");
const { handleAwsRequest } = require("../helpers");

async function listCertificatesByEnvironmentName(req, res) {
  const handle = async () => {
    const baseConfig = {
      credentials: res.locals.credentials,
      region: res.locals.provider.backend.region,
    };
    const iam = await getIam(baseConfig);

    const fn = () => iam.listRoles({}).promise();
    return await handleAwsRequest({ fn });
  };
  const extractOutput = async (outputs) => {
    return outputs.Roles.map((r, k) => {
      return { arn: r.Arn, name: r.RoleName };
    });
  };
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listCertificatesByEnvironmentName;
