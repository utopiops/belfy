const fileHelper = require('../../common/file-helper');
const config = require('../../../config');
const handlebars = require('handlebars');
const constants = require('../../../shared/constants');
const LogmetricService = require('../../../services/logmetric');

const logmetricService = new LogmetricService();

const {
    promisify
} = require('util');
const execFile = promisify(require('child_process').execFile);

/**
 * Folder organization:
 *  .
 *  ecs-service
 *      main.tf
 *      ssm
 *          secret1
 *          secret2
 *          secret(n)
 *      ecr
 *          ecr1
 *          ecr2
 *          ecr(n)
 *      ...
 *  main.tf
 */

exports.create = async (rootFolderPath, moduleFolderPath, options) => {

    const moduleFolderFullPath = `${rootFolderPath}/${moduleFolderPath}`
    await fileHelper.createFolder(moduleFolderFullPath);    
    
    // Copy the ECS service module to the user folder
    var ecsModulePath = './terraform-modules/aws/ecs-service/';
    await fileHelper.copyFolder(ecsModulePath, moduleFolderFullPath);

    // Add the task_definition resource to the main.tf in the copied file.
    // The reason that TD is separated in a different template file is that it can have
    // multiple blocks of volume dynamically set based on the user input.
    // TODO: Replace this block of code by using the dynamic keyword available in TF 0.12
    const td = await fileHelper.readFile(`${moduleFolderFullPath}/task-definition.handlebars`);
    const tdTemplate = handlebars.compile(td);
    await fileHelper.appendToFile(`${moduleFolderFullPath}/main.tf`, tdTemplate({
        volumes: options.taskDefinition.volumes,
        taskRole: options.taskDefinition.taskRole,
        networkMode: options.taskDefinition.networkMode,
        memory: options.taskDefinition.memory,
        cpu: options.taskDefinition.cpu
    }));

    const containersDefinition = await processContainers(
        moduleFolderFullPath,
        options.taskDefinition.containers, 
        options.region, 
        options.environment,
        options.appName, 
        options.logProviderId, 
        options.accountId);
    await fileHelper.writeToFile(`${moduleFolderFullPath}/containers_definition.tpl`, containersDefinition.tpl);
    
    // If we are using some modules/resources in the container provide them through the template vars otherwise
    // we just render the container_definition.tpl without vars  
    const containerDef = await fileHelper.readFile(`${moduleFolderFullPath}/container-def-template.handlebars`);
    const containerDefTemplate = handlebars.compile(containerDef);
    var containerDefTemplateData = {};
    if ( containersDefinition.vars.length ) {
        containerDefTemplateData.vars = true,
        containerDefTemplateData.variableValues = containersDefinition.vars
    }
    console.log(`containerDefTemplate(containerDefTemplateData): ${containerDefTemplate({...containerDefTemplateData})}`);
    await fileHelper.appendToFile(`${moduleFolderFullPath}/main.tf`, containerDefTemplate({...containerDefTemplateData}));

    // add the module to the main.tf file in the root directory
    const use = await fileHelper.readFile(`${moduleFolderFullPath}/use.handlebars`);
    const template = handlebars.compile(use);
    console.log(`containerName for ${options.appName}: ${options.servicesContainerName}`);
    console.log(`data igName: ${options.igName}`);
    const data = {
        listenerArn: options.listenerArn,
        igName: options.igName,
        appName: options.appName,
        environment: options.environment,
        serviceName: `${options.appName}`,
        ecsServiceModulePath: `"./${options.appName}"`,
        serviceFamily: `"${options.appName}"`,
        albProtocol: `"${options.albProtocol}"`,
        albListenerPort: `"${options.albListenerPort}"`,
        certificateArn: `"${options.certificateArn}"`,
        hostName: `"${options.hostName}"`,
        containerPort: `"${options.containerPort}"`,
        containerName: `"${options.servicesContainerName}"`,
        ecsName: options.ecsName,
        serviceDesiredCount: `${options.serviceDesiredCount}`,
    }

    await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, template({
        data
    }));

}


/**
 * The containers' preprocessing is done by ecsApplicationHelper and here we actually go through different sections of the containers
 * and do the extra processing on the containers, whether it's adding some properties to the containers (such as logProvider), or 
 * provisioning other resources such as ssm parameters.
*/

const processContainers = async (ecsServiceRootFolderPath, containers, region, environmentName, applicationName, logProviderId, accountId) => {
    var tplVars = [];
    var logProvider = null;
    if (logProviderId) { // NOTE: This says providing logmetrics overwrites their settings
        logProvider = await fetchLogProvider(logProviderId, accountId);
    }
    const ecrRepositoriesToCreate = [];
    const containersPms = containers.map(async c => {
        await createSecrets(c.secrets, ecsServiceRootFolderPath, environmentName, applicationName);
        if (!c.image) {
            const ecrRepoName = `${environmentName}-${applicationName}-${c.name}`;
            ecrRepositoriesToCreate.push(ecrRepoName);
            const tplVar = {
                variable: `ecr-${c.name}`,
                value: `\${module.ecr-${ecrRepoName}.repository_url}`
            };
            tplVars.push(tplVar);
            c.image = `\${${tplVar.variable}}`;
        }
        if (logProviderId) {
            c.logConfiguration = composeLogConfiguration(c.name, region, environmentName, applicationName, logProvider);
        }
        return c;
    });

    
    const containersProcessed = await Promise.all(containersPms);
    if (ecrRepositoriesToCreate.length > 0) {
        await createEcrRepositories(ecrRepositoriesToCreate, ecsServiceRootFolderPath)
    }
    return {
        tpl: JSON.stringify(containersProcessed, null, 2),
        vars: tplVars
    };
}

const createEcrRepositories = async (repositoryNames, rootFolderPath) => {
    const ecrFolderPath = `${rootFolderPath}/ecr`;
    await fileHelper.createFolder(ecrFolderPath);

    var ecrModulePath = './terraform-modules/aws/ecr/';
    const pms = repositoryNames.map(async name => {
        const moduleFolderFullPath = `${ecrFolderPath}/${name}`
        await fileHelper.copyFolder(ecrModulePath, moduleFolderFullPath);
        
        const use = await fileHelper.readFile(`${moduleFolderFullPath}/use.handlebars`);
        const useTemplate = handlebars.compile(use);
        await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, useTemplate({
            modulePath: `./ecr/${name}`,
            name: name,
            imageTagMutability: 'MUTABLE',
            scanOnPush: false
        }));
    });
    await Promise.all(pms);
}

// Create SSM parameters per secret in the container
const createSecrets = async (secrets, rootFolderPath, environmentName, applicationName) => {
    console.log(`secrets: ${JSON.stringify(secrets)}`);
    const secretsFolderPath = `${rootFolderPath}/ssm`;
    await fileHelper.createFolder(secretsFolderPath);

    var ssmModulePath = './terraform-modules/aws/ssm/ssm-parameter/';
    const pms = secrets && secrets.map(async secret => {
        const moduleFolderFullPath = `${secretsFolderPath}/${secret.name}`
        await fileHelper.copyFolder(ssmModulePath, moduleFolderFullPath);
        // As the ssm-parameter module support different types, they are stored as handlebars and we just pick the right one
        await fileHelper.copyFile(`${moduleFolderFullPath}/secure-ssm-parameter.handlebars`, `${moduleFolderFullPath}/secure-ssm-parameter.tf`)
        const use = await fileHelper.readFile(`${moduleFolderFullPath}/use.handlebars`);
        const useTemplate = handlebars.compile(use);
        await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, useTemplate({
            modulePath: `./ssm/${secret.name}`,
            moduleName: `${secret.name}`,
            name: `/${environmentName}/${applicationName}/${secret.name}`,
            value: secret.valueFrom
        }));
    
        // We add the IAM policy to the task execution role per ssm parameter
        const iamPolicy = await fileHelper.readFile(`${rootFolderPath}/ssm-iam-policy.handlebars`);
        const iamPolicyTemplate = handlebars.compile(iamPolicy);
        await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, iamPolicyTemplate({
            envName: environmentName,
            name: secret.name,
            moduleName: `ssm-parameter-${secret.name}`
        }));
    });
    await Promise.all(pms);
}


const fetchLogProvider = async (providerId, accountId) => {
    const provider = await logmetricService.getProvider(providerId, { accountId });
    console.log(`logprovider: ${JSON.stringify(provider, null, 2)}`);
    return provider;
}

const composeLogConfiguration = (containerName, region, environmentName, applicationName, logProvider) => {
    var logConfiguration;
    if (logProvider.serviceProvider === constants.logProviders.CloudWatch) {
        logConfiguration = {
            logDriver: "awslogs",
            options: {
                "awslogs-group": `${environmentName}/${applicationName}/${containerName}`,
                "awslogs-region": region
            }
        }
    }
    return logConfiguration;
}

exports.update = async (accountId, options) => {

}

exports.delete = async (accountId, options) => {

}