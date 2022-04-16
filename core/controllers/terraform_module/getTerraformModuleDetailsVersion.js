"use strict";
const { handleRequest } = require('../helpers');
const TerraformModuleService = require('../../db/models/terraform_module/terraformModule.service');

async function getTerraformModuleDetailsVersion(req, res) {
  const handle = async () => {
    const { environmentId } = res.locals;
    const { version, tfModuleName } = req.params;
    return await TerraformModuleService.getTerraformModuleDetailsVersion(environmentId, tfModuleName, version);
  }
  const extractOutput = async (outputs) => (outputs)
  await handleRequest({ req, res,extractOutput, handle });
}

exports.handler = getTerraformModuleDetailsVersion;
