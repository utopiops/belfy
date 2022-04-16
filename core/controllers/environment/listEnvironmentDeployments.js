const { handleRequest } = require('../helpers');
const EnvironmentDeploymentService = require('../../db/models/environment/environmentDeployment.service');

async function listEnvironmentDeployments(req, res) {

	const handle = async () => {
        const { accountId } = res.locals;
        const { environmentName } = req.query;
		return await EnvironmentDeploymentService.list(accountId, environmentName);;
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = listEnvironmentDeployments;
