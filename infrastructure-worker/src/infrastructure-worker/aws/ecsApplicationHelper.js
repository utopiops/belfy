const ecsHelper             = require('../../infrastructure-worker/aws/compute/ecsHelper');
const ecsServiceHelper      = require('../../infrastructure-worker/aws/compute/ecsServiceHelper');
const constants             = require('../../shared/constants');
const JenkinsPipelineService= require('../../pipeline-worker/jenkins');
const UserApplicationService= require('../../services/user-application');

/**
 * This helper is responsible for creating the resources:
 *  - ECS cluster (Only once per environment (1))
 *  - ECS service (Per application)
 * 
 * (1): ECS cluster needs to be created only once, and none of it's few properties are related to any specific
 * application. So, to make sure that we create this resource only once, we check if the ECS application is new
 * (i.e. the user has just added this application to their environment) so we create the ECS cluster otherwise not.
 * This way it's guaranteed that the ECS cluster is not created more that once.
 */
class handler {
    canHandle = (kind, provider) => {
        // TODO: Checking the provider looks redundant here, just remove it if it's safe and if not MAKE it safe!
        return kind.toLocaleLowerCase() === constants.applicationKins.ecs && provider.toLocaleLowerCase() === constants.applicationProviders.aws;
    }

    parse = async (application) => {
        console.log(`parsing application: ${JSON.stringify(application, null, 2)}`);
        var appDetails = {
            name: application['generalDetails']['appName'],
            description: application['generalDetails']['description'],
            provider: application['generalDetails']['provider'],
            platform: application['platform']['name'],
            instanceGroup: application.instanceGroup,
            dnsSettings: application['platform']['dnsSettings'],
            kind: application['platform']['name'],
            logProviderId: application['logsmetrics']['logProvider'],
            metricProviderId: application['logsmetrics']['metricProvider'],
        };
        // Extract the app details that need pre-processing
        const { taskDefinition, variables } = this.extractTaskDefinition(application['platform'], appDetails.name, application['generalDetails']['envName']);
        appDetails.taskDefinition = taskDefinition;
        appDetails.variables = variables;
        appDetails.infrastructureDetails = this.extractInfrastructureDetails(application['infrastructure']);
        appDetails.appCode = this.extractAppCodeDetails(application['appCode']);
        console.log(`the resulting appDetails: ${JSON.stringify(appDetails, null, 2)}`);
        return appDetails;
    }

    // TODO: Add exception handling
    handle = async (application, rootFolderPath, environmentName, region, accountId, isNew = false) => {
        //const app = isNew ? this.initializeApplication(application) : application; // This would no longer be applicable as the applications passed to this method are already parsed
        const app = application;
        console.log(`ecs app: ${JSON.stringify(app, null, 2)}`);
        var promises = [];

        // We pass the app by value so we don't let the changes made to the object during the 
        // preparations required in the internal modules responsible for the TF creation affect
        // the representation of the object in the database
        const ecsClusterPms = this.createEcsCluster(JSON.parse(JSON.stringify(app)), environmentName, rootFolderPath);
        promises.push(ecsClusterPms);

        const ecsServicePms = this.createEcsService(JSON.parse(JSON.stringify(app)), environmentName, region, rootFolderPath, accountId);
        promises.push(ecsServicePms);
        await Promise.all(promises); // TODO: try to return this promise (which perhaps can resolve to app) instead of awaiting it here, if it makes sense

        const envResources = {
            alb: {
                listeners: [
                    {
                        port: app.dnsSettings.exposedAsPort,
                        protocol: app.dnsSettings.protocol.toLocaleUpperCase(),
                        certificate: app.dnsSettings.certificate,
                        isDefault: true
                    }
                ]
            }
        };

        return { parsedApp: app, envResources }; // We return the parsed application to be saved in the database
    };

    createEcsService = async (app, environmentName, region, rootFolderPath, accountId) => {
        // TODO: at the moment the parameters passed to the ecsHelper are becoming confusing, so organize them ASAP.
        var options = {
            listenerArn: `\${module.alb.listener_${app.dnsSettings.exposedAsPort}_arn}`,
            accountId,
            region,
            environment: environmentName,
            appName: app.name,
            taskDefinition: app.taskDefinition, // This contains only the general settings of the TD
            logProviderId: app.logProviderId,
            igName: app.instanceGroup,
            // TODO: Decide if load balancer is alb or nlb (we only support alb for now)
            albProtocol: app.dnsSettings.protocol.toLocaleUpperCase(),
            albListenerPort: app.dnsSettings.exposedAsPort,
            containerPort: app.taskDefinition.containers[app.dnsSettings.containerToExpose].portMappings[app.dnsSettings.portToExpose].containerPort,
            certificateArn: app.dnsSettings.certificate,
            hostName: `${environmentName}-${app.name}.${app.dnsSettings.exposedAsDomain}`, // TODO: Get the subdomain format from the user input
            servicesContainerName: `${app.taskDefinition.containers[app.dnsSettings.containerToExpose].name}`,
            containerName: app.name,
            ecsName: `${environmentName}-cluster`,
            serviceDesiredCount: app.taskDefinition.serviceDesiredCount,
            containerPorts: JSON.stringify(app.taskDefinition.containerPorts),
            containerDefinition: `<<DEFINITION
${JSON.stringify(app.taskDefinition.containers, null, 2)}
DEFINITION`
        };

        var applicationFolderPath = `${options.appName}`; // The relative path the module will be copied to
        console.log(`passing: ${options.igName}`);
        await ecsServiceHelper.create(rootFolderPath, applicationFolderPath, options);
    }

    // This function is idempotent, make sure keep it like that
    createEcsCluster = async (app, environmentName, rootFolderPath) => {
        console.log(`createEcsCluster app: ${JSON.stringify(app, null, 2)}`);
        var options = {
            clusterName: `${environmentName}`
        }

        console.log(`creating ecs for app: ${app.name}`);
        const ecsModuleFolderPath = `ecs-cluster`;
        await ecsHelper.create(rootFolderPath, ecsModuleFolderPath, options);
    }

    extractTaskDefinition = (platformDetails, appName, envName) => {
        console.log(`extracting task definition from: ${JSON.stringify(platformDetails, null, 2)}`);
        var taskDefinition = {};
        // General Details
        if (platformDetails['tdGeneralSettings']['taskRole'] !== 'none') { // TODO: Handle this in the front-end
            taskDefinition.taskRole = platformDetails['tdGeneralSettings']['taskRole'];
        }

        taskDefinition.serviceDesiredCount = platformDetails['tdGeneralSettings']['desiredCount'];
        taskDefinition.networkMode = platformDetails['tdGeneralSettings']['networkMode'];
        taskDefinition.cpu = platformDetails['tdGeneralSettings']['cpu'];
        taskDefinition.memory = platformDetails['tdGeneralSettings']['memory'];
        taskDefinition.tags = platformDetails['tdGeneralSettings']['tags'];
        const { containers, variables } = this.extractContainers(platformDetails.containers, platformDetails.variables);
        taskDefinition.containers = containers;

        // Set the taskDefinition load balancer // TODO: delete this if not used! why isn't this 💩 used?
        const lb = {
            protocol: platformDetails['dnsSettings']['protocol'].toLocaleUpperCase(),
            listenerPort: platformDetails['dnsSettings']['exposedAsPort'],
            containerPort: platformDetails['dnsSettings']['portToExpose'],
        }
        taskDefinition.volumes = platformDetails['tdGeneralSettings']['volumes'];
        return {
            taskDefinition,
            variables
        };
    }

    extractInfrastructureDetails = (infrastructureDetails) => {
        return infrastructureDetails.ecsInfrastructure;
    }

    extractAppCodeDetails = (appCodeDetails) => {
        return appCodeDetails;
    }

    extractContainers = (containersDetails, defaultValues) => {
        console.log(`extracting containers from: ${JSON.stringify(containersDetails, null, 2)}`);
        var containers = [];
        var variables = []; // An array of objects { name, defaultValue} to store the default values of the variables (currently used only in the image TAG and container environment variables)

        containersDetails.map(cd => {
            var container = {};
            container.name = cd['containerName'];

            // ATM we just support public repositories and ECR. 
            // TODO: get rid of cd['dockerRepoUsername'], cd['dockerRepoPassword'] everywhere, ui, core?
            // TODO: let the users to refer to private repository.
            if (cd['dynamicImage']) { // if this is true, container image TAG will be dynamically provided, so the image is gonna be determined by ECR and the user should provide the tag
                container.image = `$${cd['containerName']}_image_tag`; // the environment variable to expect should be ⏩<app name>-<container name>_image_tag⏪
                variables.push(
                    {
                        name: [`${cd['containerName']}_image_tag`],
                        defaultValue: 'latest' // by default the tag ⏩latest⏪ will be used
                    }
                );
            } else {
                container.image = cd['imageName']
            }

            // Set environment variables
            container.environment = [];

            if (/^\$[a-zA-Z].*$/.test(cd.imageName)) { // if the value is a variable (it starts with a single $ followed by a letter)
                variables.push(
                    {
                        name: cd.imageName,
                        defaultValue: defaultValues[cd.imageName] || ''
                    }
                );
            }

            cd['envVars'] && cd['envVars'].map(envVar => {
                if (/^\$[a-zA-Z].*$/.test(envVar['value'])) { // if the value is a variable (it starts with a single $ followed by a letter)
                    variables.push(
                        {
                            name: envVar['value'],
                            defaultValue: defaultValues[envVar['value']] || ''
                        }
                    );
                }
                container.environment.push({
                    name: envVar['key'],
                    value: envVar['value']
                });
            });

            // Set secrets
            container.secrets = [];
            cd['secrets'] && cd['secrets'].map(secret => container.secrets.push({
                name: secret['key'],
                valueFrom: secret['value']
            }));

            // Set port mappings
            container.portMappings = [];
            cd['ports'] && cd['ports'].map(pm => {
                var toPush = {
                    containerPort: Number(pm['port'])
                };
                // Check if host port is not to be dynamically assigned (Note: we don't even set this at the moment)
                toPush.hostPort = pm['hostPort'] ? Number(pm['hostPort']) : 0;
                // Check if protocol is set (Note: we don't even set this at the moment)
                toPush.protocol = pm['protocol'] ? pm['protocol'] : 'tcp';
                container.portMappings.push(toPush);
            });

            // Set soft limit and/or hard limit
            container.memoryReservation = cd['memoryRequest'];
            container.memory = cd['memoryLimit'];

            // container.cpuReservation = cd['cpuRequest']; // TODO: Should I set this?
            container.cpu = cd['cpuLimit'];

            container.essential = cd['essential'];

            // Set volumes
            container.mountPoints = cd['mountPoints'];

            // TODO: add other properties like volumes, logs ...

            containers.push(container);
        });

        return {
            containers,
            variables
        };
    }


    loadBalancerType(lb) {
        if (!lb) { // Verification
            return;
        }
        if (['HTTP', 'HTTPS', 'TCP', 'TLS'].indexOf(lb.protocol) !== -1) {
            return 'alb';
        } else { // At this stage we just support ALB and NLB (not Classic LB)
            return 'nlb';
        }
    }

}

module.exports = handler;