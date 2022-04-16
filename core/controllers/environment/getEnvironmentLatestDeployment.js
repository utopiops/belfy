const { handleRequest } = require('../helpers');
const EnvironmentDeploymentService = require('../../db/models/environment/environmentDeployment.service');

async function getEnvironmentLatestDeployment(req, res) {
	const handle = async () => {
		const { accountId, environmentName } = res.locals;
	
		return await EnvironmentDeploymentService.getEnvironmentLatestDeployment(accountId, environmentName);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getEnvironmentLatestDeployment;
