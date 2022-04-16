const { handleRequest } = require('../helpers');
const customDomainStaticWebsiteService = require('../../db/models/utopiops_application/customDomainStaticWebsite.service');

async function createPipeline(req, res) {
  const handle = async () => {
    const { accountId } = res.locals;
    const { applicationName } = req.params;
    return await customDomainStaticWebsiteService.createPipeline(accountId, applicationName, res.locals.headers);
  };

  return handleRequest({ req, res, handle });
}

exports.handler = createPipeline;
