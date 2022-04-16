const { handleRequest } = require('../helpers');
const UtopiopsApplicationService = require('../../db/models/utopiops_application/utopiopsApplication.service');

async function listApplications(req, res) {
	const handle = async () => {
		const { accountId } = res.locals;

		return await UtopiopsApplicationService.listApplications(accountId);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = listApplications;
