const constants     = require('../../shared/constants');
const fileHelper    = require('../common/file-helper');
const processHelper = require('../../infrastructure-worker/common/process-helper');

class AwsInitializeTerraformHelper {
  
  canHandle(provider) {
    return provider.toLocaleLowerCase() === constants.applicationProviders.aws;
  }

  initialize = async (rootFolderPath, providerDetails, stateKey) => {
    
    // Make sure the root folder (where the Terraform modules will build up) doesn't exist
    // Delete the user folder if it exists. This help in retries by avoiding unexpected behavior.
    await fileHelper.deleteFolder(rootFolderPath);

    await fileHelper.createFolder(rootFolderPath);
    const params = {
        ...providerDetails,
        stateKey
    }
    await processHelper.initializeMainTerraform(params, rootFolderPath);
  }
}

module.exports = AwsInitializeTerraformHelper;