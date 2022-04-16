const { handleRequest } = require('../helpers');
const UtopiopsApplicationService = require('../../db/models/utopiops_application/utopiopsApplication.service');

async function getApplicationDetails(req, res) {
	const handle = async () => {
		const { accountId } = res.locals;
    const { applicationName } = req.params;
		return await UtopiopsApplicationService.getApplicationDetails(accountId, applicationName);
	};

  const extractOutput = (result) => result;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getApplicationDetails;
