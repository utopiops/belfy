const AwsGlobalResourcesBaseHelper  = require('../awsGlobalResourcesBaseHelper');
const config                        = require('../../../config');
const constants                     = require('../../../shared/constants');
const fileHelper                    = require('../../common/file-helper');
const handlebars                    = require('handlebars');
const processHelper                 = require('../../common/process-helper');
const uuid                          = require('uuid/v4');

const awsGlobalResourcesBaseHelper = new AwsGlobalResourcesBaseHelper();



class JenkinsHelper {

    canHandle(ciName, provider) {
        return ciName.toLocaleLowerCase() === constants.ci.jenkins && provider.toLocaleLowerCase() === constants.cloudProviders.aws
    }

    // NOTE: One Jenkins for all environments
    create = async (options, extras, accountId) => {

        await awsGlobalResourcesBaseHelper.prepare(accountId);


        console.log(`jenkinsOptions: ${JSON.stringify(options)}`);
        // Create the folder TODO: check if it doesn't exist
        const randomPath = uuid();
        var rootFolderPath = `${config.userInfRootPath}/user-infrastructure/${accountId}/${randomPath}`
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

        await processHelper.runTerraform(rootFolderPath);
        const outputs = processHelper.getTerraformOutput(rootFolderPath, {accountId});

        // TODO: Save the jenkins endpoint and maybe username and password in database then add the ci configuration (Jenkins job)

    }
}

module.exports = JenkinsHelper;