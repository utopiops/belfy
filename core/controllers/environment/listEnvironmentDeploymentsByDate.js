const { handleRequest } = require('../helpers');
const EnvironmentDeploymentService = require('../../db/models/environment/environmentDeployment.service');

async function listEnvironmentDeploymentsByDate(req, res, next) {
	const handle = async () => {
		const { accountId } = res.locals;
		return await EnvironmentDeploymentService.listByDate(accountId);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = listEnvironmentDeploymentsByDate;
