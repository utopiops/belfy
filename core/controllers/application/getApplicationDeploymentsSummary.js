const { handleRequest } = require('../helpers');
const ApplicationDeploymentService = require('../../db/models/application/applicationDeployment.service');

async function getApplicationDeploymentsSummary(req, res, next) {
	const handle = async () => {
	const { accountId} = res.locals;
	const { environmentName, applicationName } = req.params;
	const { startDate , endDate } = req.query;
	return await ApplicationDeploymentService.getSummary(accountId, startDate, endDate, environmentName, applicationName);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getApplicationDeploymentsSummary;
