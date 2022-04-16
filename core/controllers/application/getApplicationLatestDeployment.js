const { handleRequest } = require('../helpers');
const ApplicationDeploymentService = require('../../db/models/application/applicationDeployment.service');

async function getApplicationLatestDeployment(req, res) {
	const handle = async () => {
		const { accountId, environmentName } = res.locals;
		const { applicationName } = req.params;
	
		return await ApplicationDeploymentService.getApplicationLatestDeployment(accountId, environmentName, applicationName);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getApplicationLatestDeployment;
