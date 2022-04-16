const { handleRequest } = require('../helpers');
const EnvironmentDeploymentService = require('../../db/models/environment/environmentDeployment.service');

async function getEnvironmentDeploymentsSummary(req, res, next) {
	const handle = async () => {
	const { accountId} = res.locals;
	const { startDate , endDate } = req.query;
  const { environmentName } = req.params;
	return await EnvironmentDeploymentService.getSummary(accountId, startDate, endDate, environmentName);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getEnvironmentDeploymentsSummary;
