const { listTfModuleVersions } = require('../../db/models/terraform_module/terraformModule.service');
const { handleRequest } = require('../helpers');

async function listTerraformModuleVersions(req, res) {
    const { accountId, environmentName } = res.locals;
    const { tfModuleName } = req.params;

	const handle = async () => {
		return await listTfModuleVersions(accountId, environmentName, tfModuleName);
	};

	const extractOutput = async (outputs) => outputs.versions;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = listTerraformModuleVersions;
