const { handleRequest } = require('../helpers');
const customDomainStaticWebsiteService = require('../../db/models/utopiops_application/customDomainStaticWebsite.service');
const yup = require('yup');
const constants = require('../../utils/constants');

async function getApplicationBandwidth(req, res) {
  // Schema validation
  const validationSchema = yup.object().shape({
    startTime: yup.string().required(),
    endTime: yup.string().required(),
  });

  const handle = async () => {
    const { accountId } = res.locals;
    const { domainName, applicationName } = req.params;
    const { startTime, endTime } = req.body;

    return await customDomainStaticWebsiteService.getApplicationBandwidth(accountId, domainName, applicationName, startTime, endTime);
  };

  const extractOutput = async (outputs) => {
    return outputs;
  };

  return handleRequest({ req, res, validationSchema, handle, extractOutput});
}

exports.handler = getApplicationBandwidth;
