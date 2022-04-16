const { handleRequest } = require('../helpers');

const UtopiopsApplicationService = require('../../db/models/utopiops_application/utopiopsApplication.service');


async function getApplicationResources(req, res) {
	const handle = async () => {
    const { accountId } = res.locals;
    const { applicationName } = req.params;
		return await UtopiopsApplicationService.getApplicationResources(accountId, applicationName);
	};

  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getApplicationResources;
