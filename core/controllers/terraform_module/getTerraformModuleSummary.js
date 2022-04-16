const { handleRequest } = require('../helpers');
const TerraformModuleService = require('../../db/models/terraform_module/terraformModule.service');

async function getTerraformModuleSummary(req, res) {
	const handle = async () => {
    const { environmentId } = res.locals;
    const tfModuleName = req.params.tfModuleName;

		return TerraformModuleService.getTerraformModuleSummary(environmentId, tfModuleName);
	};

  const extractOutput = (result) => result;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getTerraformModuleSummary;
