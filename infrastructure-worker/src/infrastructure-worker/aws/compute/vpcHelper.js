const fileHelper = require('../../common/file-helper');
const config = require('../../../config');
var handlebars = require('handlebars');
const {
    promisify
} = require('util');
const execFile = promisify(require('child_process').execFile)



exports.create = async (rootFolderPath, options = {}) => {
    // create the folder
    

    // copy the VPC module to the user folder
    var vpcModulePath = './terraform-modules/aws/vpc/';
    var vpcFolderPath = `${rootFolderPath}/vpc`; // Go inside the vpc folder
    await fileHelper.copyFolder(vpcModulePath, vpcFolderPath);


    // create the terraform.tfvars file
    var fileName = 'terraform.tfvars';
    await fileHelper.createFile(fileName, vpcFolderPath);

    // add the module to the main.tf file in the root directory

    const use = await fileHelper.readFile(`${vpcFolderPath}/use.handlebars`);
    const template = handlebars.compile(use);
    const data = {
        public_subnets: options.public_subnets || "[\"10.249.4.0/22\", \"10.249.8.0/22\", \"10.249.16.0/22\"]",
        private_subnets: options.private_subnets || "[\"10.249.32.0/22\", \"10.249.64.0/22\", \"10.249.128.0/22\"]",
        azs: options.azs || "[\"ap-southeast-2a\", \"ap-southeast-2b\", \"ap-southeast-2c\"]",
        vpcName: options.vpcName || "\"Test-VPC\"",
        tagName: options.tagName || "\"Test-VPC\"",
        vpcNetworkCidr: options.vpcNetworkCidr || "\"10.249.0.0/16\"",
        environment: options.environment || "\"test\""
    }

    await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, template({
        data
    }));
}
