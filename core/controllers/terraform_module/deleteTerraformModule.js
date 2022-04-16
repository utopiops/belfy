const { handleRequest } = require('../helpers');
const TerraformModuleService = require('../../db/models/terraform_module/terraformModule.service');

async function deleteDatabase(req, res) {
	const handle = async () => {
		const tfModuleName = req.params.tfModuleName;
		const environmentId = res.locals.environmentId;
		return await TerraformModuleService.deleteTfModule(environmentId, tfModuleName);
	};

	return handleRequest({ req, res, handle });
}

exports.handler = deleteDatabase;
