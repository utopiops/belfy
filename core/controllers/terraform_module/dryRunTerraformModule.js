"use strict";
const { handleRequest } = require('../helpers');
const TerraformModuleService = require('../../db/models/terraform_module/terraformModule.service');
const yup = require('yup');

async function dryRunTerraformModule(req, res) {
  const validationSchema = yup.object().shape({
    values: yup.array().of(
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
    const { accountId, userId, environmentName, provider, credentials, environmentId, headers } = res.locals;
    const {version} = req.body;
    const values = req.body.values;
    const secrets = req.body.secrets;
    const { tfModuleName } = req.params;
    return await TerraformModuleService.dryRunTerraformModule(accountId, environmentId, userId, environmentName, tfModuleName, version, provider, credentials, headers, values, secrets);
  }

  const extractOutput = async (outputs) => (outputs);

  await handleRequest({ req, res, extractOutput, handle, validationSchema });
}

exports.handler = dryRunTerraformModule;