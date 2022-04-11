const fileHelper = require('../../common/file-helper');
const config = require('../../../config');
var handlebars = require('handlebars');
const {
    promisify
} = require('util');
const execFile = promisify(require('child_process').execFile);

// NOTE: One Jenkins for all environments
exports.create = async (rootFolderPath, accountId, options, withExec) => {
    console.log(`jenkinsOptions: ${JSON.stringify(options)}`);
    // Create the folder TODO: check if it doesn't exist
    // var rootFolderPath = `${config.userInfRootPath}/user-infrastructure/${accountId}`
    var jenkinsFolderPath = `${rootFolderPath}/jenkins`;
    await fileHelper.createFolder(jenkinsFolderPath);

    // Copy the jenkins module to the user folder
    var jenkinsModulePath = './terraform-modules/aws/jenkins/';
    await fileHelper.copyFolder(jenkinsModulePath, jenkinsFolderPath);

    // Add the task_definition resource to the main.tf in the copied file.
    // The reason that TD is separated in a different template file is that it can have
    // multiple blocks of volume dynamically set based on the user input.
    // TODO: Replace this block of code by using the dynamic keyword available in TF 0.12
    const instance = await fileHelper.readFile(`${jenkinsFolderPath}/instance.handlebars`);
    const iTemplate = handlebars.compile(instance);
    await fileHelper.appendToFile(`${jenkinsFolderPath}/main.tf`, iTemplate({
        rootVolumeType: options.rootVolumeType,
        rootVolumeIops: options.rootVolumeIops,
        ebsBlocks: options.otherVolumes
    }));

    // add the module to the main.tf file in the root directory
    const use = await fileHelper.readFile(`${jenkinsFolderPath}/use.handlebars`);
    const template = handlebars.compile(use);
    const data = {
        jenkinsModulePath: `"./jenkins"`,
        albProtocol: `"HTTP"`, // get this from the user input
        albListenerPort: `"51234"`, // get this from the user input
        certificateArn: `"${options.certificateArn}"`,
        hostName: 'jenkins.utopiops.com', // TODO: get this from the user input
        containerPort: `"${options.containerPort}"`,
        rootVolumeSize: `${options.rootVolumeSize}`,
        rootVolumeType: `${options.rootVolumeType}`,
        rootVolumeDelOnTerm: `${options.rootVolumeDelOnTerm}`,
        servicesContainerPort: `"${options.servicesContainerPort}"`,
        instanceType: `"${options.instanceType}"`,
        keyPairName: `"${options.sshKey}"`,
        userData: `${options.userData || ''}`
    }
    console.log(`jenkins data: ${JSON.stringify(data)}`);

    await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, template({
        data
    }));

    if (withExec) {
        try {
            // run terraform
            console.log(`------------------------------`);
            console.log(`Executing terraform init`);
            var {
                stdout
            } = await execFile('terraform', ['init'], {
                cwd: rootFolderPath
            });
            console.log(`init: ${stdout}`);
            console.log(`------------------------------`);
            console.log(`Executing terraform apply --auto-approve`);
            var {
                stdout2
            } = await execFile('terraform', ['apply', '--auto-approve'], {
                cwd: rootFolderPath
            });
            console.log(`apply: ${stdout2}`);

            //TODO: Call the add job to add the job with the options passed via the options parameter
        } catch (error) {
            // TODO: retry
            console.log(error);
        }
    }
}

exports.update = async (accountId, options) => {

}

exports.delete = async (accountId, options) => {

}