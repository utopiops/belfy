const { handleRequest } = require('../helpers');
const UtopiopsApplicationService = require('../../db/models/utopiops_application/utopiopsApplication.service');

async function deleteApplication(req, res) {
  const handle = async () => {
    const { accountId } = res.locals;
    const { applicationName } = req.params;

    const result = await UtopiopsApplicationService.deletePipeline(accountId, applicationName, res.locals.headers);

    if (!result.success) {
      return result;
    }
    return await UtopiopsApplicationService.deleteApplication(accountId, applicationName);
  };

  return handleRequest({ req, res, handle });
}

exports.handler = deleteApplication;
