const config = require('../../config');
const uuid = require('uuid/v4');
const vpcHelper = require('./compute/vpcHelper');
const processHelper = require('../common/process-helper');

// This module is responsible for creating the base/shared resources used by the global resources such as Jenkins, Mongodb, etc.
class AwsGlobalResourcesBaseHelper {

    prepare = async (accountId) => {

        const randomPath = uuid();
        var rootFolderPath = `${config.userInfRootPath}/user-infrastructure/${accountId}/global/vpc/${randomPath}`;

        this.initializeMainTerraform({
            accessKey: '????', // TODO: Get these from the DB
            secretKey: '????',
            region: 'ap-southeast-2'
        }, rootFolderPath);

        // Create the VPC
        const vpcDetails = {
            public_subnets: `["10.0.1.0/24", "10.0.3.0/24", "10.0.5.0/24"]`,
            private_subnets: `["10.0.2.0/24", "10.0.4.0/24", "10.0.6.0/24"]`,
            azs: `["ap-southeast-2a", "ap-southeast-2b", "ap-southeast-2c"]`,
            vpcName: `"globals shared"`,
            tagName: `"Globals Shared"`,
            vpcNetworkCidr: `"10.0.0.0/20"`,
            environment: `"test"`
        }      
        await vpcHelper.create(rootFolderPath, vpcDetails);
        await processHelper.runTerraform(rootFolderPath);
    }

    // Create the main.tf file and write the provider into it
    initializeMainTerraform = async (providerDetails, path) => {
        await fileHelper.createFile('main.tf', path);
        await fileHelper.createFile('outputs.tf', path);

        // TODO: Add the S3 state with the key accountId/region/global to the provider
        var content = `provider "aws" {
        access_key="${providerDetails.accessKey}"
        secret_key="${providerDetails.secretKey}"
        region="${providerDetails.region}"}`;
        // TODO: Add key and s3 bucket
        await fileHelper.writeToFile(`${path}/main.tf`, content);
    }
}

module.exports = AwsGlobalResourcesBaseHelper;