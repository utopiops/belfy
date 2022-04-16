const TerraformModuleService = require('../../db/models/terraform_module/terraformModule.service');
const { handleRequest } = require('../helpers');
const yup = require('yup');

async function setTerraformModuleState(req, res) {

	const validationSchema = yup.object().shape({
    code: yup.string().oneOf(['deployed', 'deploy_failed', 'destroyed', 'destroy_failed']).required(),
    job: yup.string().required()
  });

	const handle = async () => {
    const { environmentId } = res.locals;
    const { tfModuleName } = req.params;
    const state = req.body;
		return await TerraformModuleService.setState( environmentId, tfModuleName, state);
	};

	return await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = setTerraformModuleState;
