const { handleRequest } = require('../helpers');
const TerraformModuleService = require('../../db/models/terraform_module/terraformModule.service');
const yup = require('yup');

async function activateTerraformModule(req, res, next) {
	const validationSchema = yup.object().shape({
		version: yup.number().required()
	});

	const handle = async () => {
    const { environmentId } = res.locals;
		const { version } = req.body;
    const { tfModuleName } = req.params;
		return await TerraformModuleService.activateTerraformModule(environmentId, tfModuleName, version);
	};

	return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = activateTerraformModule;
