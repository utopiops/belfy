"use strict";
const { handleRequest } = require('../helpers');
const TerraformModuleService = require('../../db/models/terraform_module/terraformModule.service');
const yup = require('yup');

async function deployTerraformModule(req, res) {
  const validationSchema = yup.object().shape({
    variables: yup.array().of(
			yup.object().shape({
				key: yup.string().required(),
				value: yup.string().required(),
			})
		),
		secrets: yup.array().of(
			yup.object().shape({
				key: yup.string().required(),
				value: yup.string().required(),
			})
		)
  });

  const handle = async () => {
    const { tfModuleName } = req.params;
    const { accountId, environmentId, userId, environmentName, provider, credentials, headers } = res.locals;
    const variables = req.body.variables;
    const secrets = req.body.secrets;
    return await TerraformModuleService.deployTerraformModule(accountId, environmentId, userId, environmentName, tfModuleName, provider, credentials, headers, variables, secrets);
  }

  const extractOutput = async (outputs) => (outputs);

  await handleRequest({ req, res, extractOutput, handle, validationSchema });
}

exports.handler = deployTerraformModule;
