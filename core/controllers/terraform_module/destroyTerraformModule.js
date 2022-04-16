"use strict";
const { handleRequest } = require('../helpers');
const TerraformModuleService = require('../../db/models/terraform_module/terraformModule.service');

async function destroyTerraformModule(req, res) {

  const extractOutput = async (outputs) => (outputs);

  const handle = async () => {
    const { tfModuleName } = req.params;
    const { accountId, environmentId, userId, environmentName, provider, credentials, headers } = res.locals;
    return await TerraformModuleService.destroyTerraformModule(accountId, environmentId, userId, environmentName, tfModuleName, provider, credentials, headers);
  }
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = destroyTerraformModule;
