const { handleRequest } = require('../helpers');
const TerraformModuleService = require('../../db/models/terraform_module/terraformModule.service');

async function listAccountTerraformModules(req, res) {
	const validationSchema = null;

	const handle = async () => {
		const accountId = res.locals.accountId;
		return await TerraformModuleService.listAccountTerraformModules(accountId);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = listAccountTerraformModules;
