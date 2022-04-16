const { listTfModules } = require('../../db/models/terraform_module/terraformModule.service');
const { handleRequest } = require('../helpers');

async function listTerraformModules(req, res) {
    const { accountId, environmentName } = res.locals;

	const handle = async () => {
		return await listTfModules(accountId, environmentName);
	};

	const extractOutput = async (outputs) => outputs.modules;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = listTerraformModules;
