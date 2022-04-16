const { handleRequest } = require("../../../helpers");
const { getAcm } = require("./getAcm");
const { handleAwsRequest } = require("../helpers");

async function listCertificatesByEnvironmentName(req, res) {
  const { region } = req.query;
  const handle = async () => {
    const baseConfig = {
      credentials: res.locals.credentials,
      region: region || res.locals.provider.backend.region,
    };
    const acm = await getAcm(baseConfig);

    const fn = () => acm.listCertificates({}).promise();
    return await handleAwsRequest({ fn });
  };
  const extractOutput = async (outputs) => {
    return outputs.CertificateSummaryList.map((c, k) => {
      return { arn: c.CertificateArn, domainName: c.DomainName };
    });
  };
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listCertificatesByEnvironmentName;
