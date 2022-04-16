const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');

async function listApplications(req, res) {
	const handle = async () => {
		const { accountId, environmentName } = res.locals;

		return await ApplicationService.listApplications(accountId, environmentName);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = listApplications;
