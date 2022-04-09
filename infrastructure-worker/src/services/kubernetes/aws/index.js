const logger = require('../../../shared/logger');
const fileHelper = require('../../../infrastructure-worker/common/file-helper');
const config = require('../../../config');
var handlebars = require('handlebars');
const {
    promisify
} = require('util');
const execFile = promisify(require('child_process').execFile);
const processHelper = require('../../../infrastructure-worker/common/process-helper');


const uuid = require('uuid/v4');
const k8sConfigsBasePath = './k8s-configurations'; // Addressed from the root of the project

class AwsKubernetesHandler {

    canHandle(provider) {
        return provider == 'aws';
    }

    // This method is responsible for creating the cluster as part of a Water-managed application
    async createApplicationCluster(environmentName, applicationName, details) {

        const clusterDetails = {};

        this.createIntegratedKubernetesInfrastructure(clusterDetails);
        this.setupAddOns();


    }

    // This method is responsible for creating a cluster (perhaps as part of a Water-managed service such as Mongodb)
    async createClusterAndDeploy(accountId, clusterDetails) {
        // Create the cluster infrastructure
        this.createIsolatedKubernetesInfrastructureAndDeploy(accountId, clusterDetails);

        // Setup add-ons
        this.setupAddOns();

    }


    async createIsolatedApplication(accountId, params, configurationPath) {


        // create the unique/isolated folder to execute the required Terraform to create this cluster
        const randomPathPart = uuid();
        var rootFolderPath = `${config.userInfRootPath}/user-infrastructure/${accountId}/${randomPathPart}`
        await fileHelper.createFolder(rootFolderPath);
        logger.verbose(`Created folder in ${rootFolderPath}`);

        // copy the kubernetes module to the unique folder to be executed
        var kubernetesModulePath = './terraform-modules/aws/kubernetes/';
        await fileHelper.copyFolder(kubernetesModulePath, rootFolderPath);

        var content = "\nprovider \"aws\" {\n" +
            `access_key="${params.accessKey}"\n` +
            `secret_key="${params.secretKey}"\n` +
            `region="${params.region}"\n}\n`;
        await fileHelper.appendToFile(`${rootFolderPath}/main.tf`, content);

        // add the variables.tfvars file in the root directory
        const use = await fileHelper.readFile(`${rootFolderPath}/isolated-use.handlebars`);
        const template = handlebars.compile(use);
        const data = {
            clusterName: params.clusterName, // ? create something unique here (note that we don't have environment here)
            accessKeyId: params.accessKey,
            secretAccessKey: params.secretKey,
            maxInstanceSize: params.maxInstanceSize,
            minInstanceSize: params.minInstanceSize,
            desiredCapacity: params.desiredCapacity,
            instanceType: params.instanceType,
            rootVolumeSize: params.rootVolumeSize,
            rootVolumeType: params.rootVolumeType,
            rootVolumeDelOnTerm: params.rootVolumeDelOnTerm,
            ecsKeyPairName: params.ecsKeyPairName
        }

        logger.verbose(`rendered data: ${template({
            data
        })}`);

        await fileHelper.createFile('terraform.tfvars', rootFolderPath);
        await fileHelper.appendToFile(`${rootFolderPath}/terraform.tfvars`, template({
            data
        }));

        //TODO: Execute the terraform init and apply here
        await processHelper.runTerraform(`${accountId}/${randomPathPart}`);

        // TODO: Execute the terraform output here and get and store the kubeconfig (to be used in the next step and for the other use cases - to be stored?!maybe)
        
        const kubectlConfig = await processHelper.getSingleTerraformOutput(`${accountId}/${randomPathPart}`, {accountId}, 'kubeconfig');
        
        const configMapAwsAuth = await processHelper.getSingleTerraformOutput(`${accountId}/${randomPathPart}`, {accountId}, 'config_map_aws_auth');
        logger.verbose(`outputs: ${configMapAwsAuth}`);

        const configFileName = 'config';
        await fileHelper.createFile(`${configFileName}`, `${rootFolderPath}/`);
        await fileHelper.writeToFile(`${rootFolderPath}/${configFileName}`, kubectlConfig);
        
        
        const authFileName = 'config_map_aws_auth.yaml';
        await fileHelper.createFile(`${authFileName}`, `${rootFolderPath}/`);
        await fileHelper.writeToFile(`${rootFolderPath}/${authFileName}`, configMapAwsAuth);
        
        // Execute the command necessary for the worker nodes to join the cluster (Stupid EKS!)
        const kubectlOutput = await processHelper.execute(`${rootFolderPath}`, 'kubectl', ['--kubeconfig', `./${configFileName}`, 'apply', '-f', authFileName]);
        logger.verbose(`kubectlOutput: ${kubectlOutput}`);

        // Install logs/metrics essentials
        this.installAddOns();

        // Deploy the application
        this.deployApplication(rootFolderPath, configurationPath, configFileName);

    }

    async setupAddOns() {

    }

    async deployApplication(rootFolderPath, configurationPath, configFileName) {
        // Just copy the configuration yaml(s) to a random folder inside the rootFolderPath and run kubectl apply. 
        // This folder is just for one off use as what matters is the configuration files and k8s takes care of everything e.g. updating
        // the same cluster, etc.
        const randomPath = uuid();
        const configCompletePath = `${k8sConfigsBasePath}/${configurationPath}`;
        await fileHelper.copyFolder(configCompletePath, `${rootFolderPath}/${randomPath}`); //TODO: where should the destination be???
        const kubectlOutput = await processHelper.execute(`${rootFolderPath}`, 'kubectl', ['--kubeconfig', `./${configFileName}`, 'apply', '-f', `./${randomPath}`]);
        logger.verbose(`kubectlOutput: ${kubectlOutput}`);
    }

    async installAddOns() {
        // TODO: implement
    }
}

module.exports = AwsKubernetesHandler;