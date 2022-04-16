const { handleRequest } = require('../helpers');
const ApplicationDeploymentService = require('../../db/models/application/applicationDeployment.service');

async function listApplicationDeploymentsByDate(req, res, next) {
	const handle = async () => {
		const { accountId } = res.locals;
		return await ApplicationDeploymentService.listByDate(accountId);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = listApplicationDeploymentsByDate;
