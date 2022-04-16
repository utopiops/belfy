const { handleRequest } = require('../helpers');
const UtopiopsApplicationService = require('../../db/models/utopiops_application/utopiopsApplication.service');

async function getApplicationDetailsInternal(req, res) {
	const handle = async () => {
    const { applicationName } = req.params;
		return await UtopiopsApplicationService.getApplicationDetailsInternal(applicationName);
	};

  const extractOutput = (result) => result;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getApplicationDetailsInternal;
