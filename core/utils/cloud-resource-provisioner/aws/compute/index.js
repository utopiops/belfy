const fileHelper = require('../../common/file-helper');
var handlebars = require('handlebars');
const { promisify } = require('util');
const execFile = promisify(require('child_process').execFile)

const initializeMainTerraform = async (providerDetails, path) => {
    await fileHelper.createFile('main.tf', path);

    var content = "provider \"aws\" {\n" +
        `access_key="${providerDetails.accessKey}"\n` +
        `secret_key="${providerDetails.secretKey}"\n` +
        `region="${providerDetails.region}"\n}\n`;
    await fileHelper.writeToFile(`${path}/main.tf`, content);
}

exports.createVpc = async (userId, vpcDetails) => {
    // create the folder
    var rootFolderPath = `./user-infrastructure/${userId}/`
    await fileHelper.createFolder(rootFolderPath);

    // create the main.tf file and write the provider into it
    initializeMainTerraform({
        accessKey: 'AKIAIQNLNXILP42UMQRA', // Get these from the DB
        secretKey: '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',
        region: 'ap-southeast-2'
    }, rootFolderPath)

    // copy the VPC module to the user folder
    var vpcModulePath = './utils/cloud-resource-provisioner/aws/terraform-modules/';
    await fileHelper.copyFolder(vpcModulePath, rootFolderPath);

    vpcFolderPath = `${rootFolderPath}/vpc`; // Go inside the vpc folder

    // create the terraform.tfvars file
    var fileName = 'terraform.tfvars';
    await fileHelper.createFile(fileName, vpcFolderPath);

    // write the variables and their values in the vterraform.tfvars
    // var data = [{
    //         key: "public_subnets",
    //         value: "[\"10.249.4.0/22\", \"10.249.8.0/22\", \"10.249.16.0/22\"]"
    //     },
    //     {
    //         key: "private_subnets",
    //         value: "[\"10.249.32.0/22\", \"10.249.64.0/22\", \"10.249.128.0/22\"]"
    //     },
    //     {
    //         key: "azs",
    //         value: "[\"ap-southeast-2a\", \"ap-southeast-2b\", \"ap-southeast-2c\"]"
    //     },
    //     {
    //         key: "vpc_name",
    //         value: "\"Test-VPC\""
    //     },
    //     {
    //         key: "tag_name",
    //         value: "\"Test-VPC\""
    //     },
    //     {
    //         key: "vpc_network_cidr",
    //         value: "\"10.249.0.0/16\""
    //     }
    // ]
    // await fileHelper.writeToFile(`${vpcFolderPath}/${fileName}`, data, {
    //     withMapping: true
    // });

    // add the module to the main.tf file in the root directory
    const moduleRef = 'module "vpc" {\n source="./vpc"\n}\n';

    const use = await fileHelper.readFile(`${vpcFolderPath}/use.handlebars`);
    const template = handlebars.compile(use);
    const data = {
        public_subnets: "[\"10.249.4.0/22\", \"10.249.8.0/22\", \"10.249.16.0/22\"]",
        private_subnets: "[\"10.249.32.0/22\", \"10.249.64.0/22\", \"10.249.128.0/22\"]",
        azs: "[\"ap-southeast-2a\", \"ap-southeast-2b\", \"ap-southeast-2c\"]",
        vpcName: "\"Test-VPC\"",
        tagName: "\"Test-VPC\"",
        vpcNetworkCidr: "\"10.249.0.0/16\"",
        environment: "\"test\""
    }

    await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, template({
        data
    }));

    // run terraform

    const { stdout  } = await execFile('terraform', ['init']);
    console.log(`init: ${stdout }`);
    // const applyCmd = await exec('terraform apply -force');
    // console.log(`apply: ${applyCmd}`);


    // await provisioningHelper.exec(folderPath);
    // // create the bucket for the user on S3
    // var userBucketName = `resources-bucket-for-user${userId}`;
    //  await provisioningHelper.createBucket(userBucketName);
    // // zip and store the file on S3
    // var zippedFile = fileHelper.zip(folderPath);
    // s3Helper.upload(userBucketName, zippedFile);
}
exports.createEc2 = (userId, ec2Details) => {
    /* This function should get the settings/specs of the EC2 and prepare the files
        required to generate an EC2 using Terraform with the specifications passed
        to this function as arguments.

        something like this:

        parameters:
        {
            name: "jenkins"
            modules:
                ["vpc_id", "vpc.vpc_id"] or ["vpc_id", "${module.vpc.vpc_id}"]
            vars:
                ["key_pair_name", "cool_key"]
        }
        
        files to be generated:

        ec2-jenkins/main.tf
        module "ec2" {
            source="s3::https://s3-eu-west-1.amazonaws.com/examplecorp-terraform-modules/ec2.zip"
            key_pair_name = "${var.key_pair_name}"
            vpc_id = "${module.vpc.vpc_id}"
        }
        ec2-jenkins/variables.tfvar
        key_pair_name = cool_key
    */
}