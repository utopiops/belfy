const { handleRequest } = require("../../../helpers");
const { getAcm } = require("./getAcm");
const { handleAwsRequest } = require("../helpers");
const constants = require('../../../../utils/constants');

async function listCertificatesStatus(req, res) {
  const handle = async () => {
    const baseConfig = {
      credentials: res.locals.credentials,
      region: res.locals.provider.backend.region,
    };
    const acm = await getAcm(baseConfig);

    // First, we get a list of all the certificates
    let fn = () => acm.listCertificates({}).promise();
    const certificates = await handleAwsRequest({ fn });

    // Check if there was an error
    if(!certificates.success) {
      return certificates;
    }

    if(!certificates.outputs.CertificateSummaryList.length) {
      return {
        success: false,
        error: {
          statusCode: constants.statusCodes.notFound,
          message: constants.errorMessages.models.elementNotFound
        }
      };
    }

    let result = {
      success: true,
      outputs: []
    };

    // Now, we make a promise for each one to get the certificate description
    // which contains certificate status
    let promises = [];
    for(let c of certificates.outputs.CertificateSummaryList) {
      fn = () => acm.describeCertificate({CertificateArn: c.CertificateArn}).promise();
      promises.push(handleAwsRequest({ fn }));
    }

    const data = await Promise.all(promises);

    for(let d of data) {
      // Check if there was an error with any of the requests
      if(!d.success) {
        result = d;
        break;
      }

      result.outputs.push({
        arn: d.outputs.Certificate.CertificateArn,
        domainName: d.outputs.Certificate.DomainName,
        status: d.outputs.Certificate.Status,
      });
    }
    return result;
  };
  const extractOutput = async (outputs) => outputs;
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listCertificatesStatus;
