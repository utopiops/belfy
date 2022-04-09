const fileHelper= require('../../common/file-helper');
const config    = require('../../../config');
const path      = require('path');
var handlebars  = require('handlebars');

// Handlebars helper to check if a string has a specific value.
// Usage: #ifEquals stringVariable "string value"
handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});

const {
    promisify
} = require('util');
const execFile = promisify(require('child_process').execFile);

exports.create = async (rootFolderPath, moduleFolderPath, options, withExec) => {
    const moduleFolderFullPath = `${rootFolderPath}/${moduleFolderPath}`
    // Make the operation idempotent
    if (!options.force) {
        if (fileHelper.folderExists(moduleFolderFullPath)) {
            console.log(`folder ${moduleFolderPath} already exists`);
            return;
        }
    }
    console.log(`creating the ecs cluster`);
    if (! await fileHelper.createFolder(moduleFolderFullPath)) {
        return;
    }
    console.log(`created the folder - ecs: ${moduleFolderFullPath}`);

    // copy the ECS module from ecsModulePath (path to the module in the source code) to the user folder
    const ecsModulePath = './terraform-modules/aws/ecs/';
    await fileHelper.copyFolder(ecsModulePath, moduleFolderFullPath);
    console.log(`copied the file to the folder ${moduleFolderFullPath}`);

    /* 
    TODO: move this to instancegroup helper
    // Add the aws_launch_configuration resource to the main.tf in the copied file.
    // The reason that LC is separated in a different template file is that it can have
    // multiple blocks of EBS volume dynamically set based on the user input.
    // TODO: Replace this block of code by using the dynamic keyword available in TF 0.12
    const td = await fileHelper.readFile(`${ecsFolderPath}/launch-configuration.handlebars`);
    const tdTemplate = handlebars.compile(td);
    await fileHelper.appendToFile(`${ecsFolderPath}/main.tf`, tdTemplate({
        rootVolumeType: options.rootVolumeType,
        rootVolumeIops: options.rootVolumeIops,
        ebsBlocks: options.otherVolumes
    }));
    */

    // add the module to the main.tf file in the root directory
    const use = await fileHelper.readFile(`${moduleFolderFullPath}/use.handlebars`);
    const template = handlebars.compile(use);
    const data = {
        clusterName: `${options.clusterName}`,
        ecsModulePath: `./${moduleFolderPath}`
        /*
        TODO: Move this to instancegroup helper
        appName: options.appName,
        ecsName: `${options.clusterName}`,
        ecrName: `"${options.ecrName}"`,
        environment: options.environment,
        imageId: `"${options.imageId}"`,
        rootVolumeSize: `${options.rootVolumeSize}`,
        rootVolumeType: `${options.rootVolumeType}`,
        rootVolumeDelOnTerm: `${options.rootVolumeDelOnTerm}`,
        servicesContainerPort: `"${options.servicesContainerPort}"`,
        instanceType: `"${options.instanceType}"`,
        ecsKeyPairName: `"${options.ecsKeyPairName}"`,
        userData: `${options.userData}`
        */
    }

    await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, template({
        data
    }));
    console.log(`added the ECS cluster module to the main.tf`);

    // add the output(s) to the outputs.tf file in the root directory
    const moduleName = `ecs-cluster`
    const outputsData = {
        outputs: [
            {
                name: `${moduleName}-cluster_id`,
                value: `${moduleName}.cluster_id`
            },
            {
                name: `${moduleName}-cluster_name`,
                value: `${moduleName}.cluster_name`
            }
        ]
    };

    try {
        const templatePath = path.resolve(__dirname, '../../../../terraform-modules/common/outputs.handlebars');
        const outputs = await fileHelper.readFile(templatePath);
        console.log(`outputs: ${JSON.stringify(outputs)}`);
        const outputsTemplate = handlebars.compile(outputs);
        console.log(`outputsTemplate: ${outputsTemplate(outputsData)}`);
        await fileHelper.appendToFile(`${rootFolderPath}/outputs.tf`, outputsTemplate(outputsData));
    } catch (error) {
        console.log(`error: ${error.message}`);
    }

}

exports.update = async (accountId, options) => {

}

exports.delete = async (accountId, options) => {

}