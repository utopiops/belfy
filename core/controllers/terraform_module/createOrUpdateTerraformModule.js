const { handleRequest } = require('../helpers');
const TerraformModuleService = require('../../db/models/terraform_module/terraformModule.service');
const yup = require('yup');

async function createOrUpdateTerraformModule(req, res, next) {
	// TODO: update validation
	const validationSchema = yup.object().shape({
		name: yup.string().required(),
		description: yup.string(),
		gitService: yup.string(),
		repositoryUrl: yup.string(),
		secretName: yup.string()
	});

	const handle = async () => {
    const { userId, environmentId } = res.locals;
    const tfModuleName = req.body.name;

		// We handle multiple endpoints with this controller, so here we try to find out which path it is
		const isFirstVersion = req.params.version == null;
		const isUpdate = req.method === 'PUT' ? true : false;
		let version = 0;
		if (!isFirstVersion) {
			version = req.params.version;
		}

		let tfModule = {
			...req.body,
      environment: environmentId,
			createdBy: userId,
		};

		console.log(`tfmodule`, JSON.stringify(tfModule, null, 2));

		if (isUpdate) {
			tfModule.version = version;
		} else if (!isFirstVersion) {
			tfModule.fromVersion = version;
		}

		delete tfModule.values;
		delete tfModule.secrets;
    delete tfModule.isActivated;

		return isFirstVersion
			? await TerraformModuleService.createTfModule(tfModule)
			: isUpdate
				? await TerraformModuleService.updateTfModule(environmentId, tfModuleName, version, tfModule)
				: await TerraformModuleService.addTfModule(environmentId, tfModuleName, version, tfModule);
	};
  
  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = createOrUpdateTerraformModule;
