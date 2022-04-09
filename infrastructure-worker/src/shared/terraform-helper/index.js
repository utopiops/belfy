const config        = require('../../config');
const constants     = require('../constants');
const fileHelper    = require('../../infrastructure-worker/common/file-helper');
const handlebars    = require('handlebars');
const path          = require('path');
const processHelper = require('../../infrastructure-worker/common/process-helper');
const uuid          = require('uuid/v4');

const utilitiesRootPath = './terraform-modules/utilities';

exports.executeUtility = async (provider, modulePath, accountId, variableValues, region, utilityId) => {
  
  // Generate a random path
  const randomPath = uuid();
  var rootFolderPath = `${config.userInfRootPath}/user-infrastructure/${accountId}/utility/${randomPath}`;
  await fileHelper.createFolder(rootFolderPath);

  // Copy the utility to the rootFolder
  await fileHelper.copyFolder(`${utilitiesRootPath}/${modulePath}`, `${rootFolderPath}/utility`);

  // Render the tfvars file
  const use = await fileHelper.readFile(path.resolve(__dirname,'./use.handlebars'));
  const template = handlebars.compile(use);

  // Copy the tfvars file to the rootFolder
  await fileHelper.appendToFile(`${rootFolderPath}/use.tf`, template({
    utilityModulePath: './utility',
    utilityName: utilityId,
    variableValues
  }));

  // Add Terraform backend to the rootFolder
  addTerraformBackend(rootFolderPath, accountId, region, provider);
  
  // execute the terraform
  await processHelper.runTerraform(rootFolderPath, { accountId });

  // TODO: publish the result
}

const addTerraformBackend = async (folder, accountId, region, provider) => {
  if (provider === constants.cloudProviders.aws) {
    processHelper.initializeMainTerraform({region}, folder, true);
  }
}