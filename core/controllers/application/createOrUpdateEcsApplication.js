const { handleRequest } = require('../helpers');
const EcsApplicationService = require('../../db/models/application/ecsApplication.service');
const yup = require('yup');
const constants = require('../../utils/constants');

async function createOrUpdateEcsApplication(req, res) {
//todo: complete validation

  // Schema validation
  const validationSchema = yup.object().shape({
    app_name: yup.string().required().lowercase().strict(),
    ecs_cluster_name: yup.string().required(),
    service_desired_count: yup.number().required(),
    networkMode: yup.string().nullable(),
    memory: yup.number().nullable(),
    cpu: yup.number().nullable(),
    task_role_arn: yup.string().nullable(),
    exposed_ports: yup
      .array()
      .ensure()
      .of(
        yup.object().shape({
          domain_suffix: yup.string(),
          exposed_container_name: yup.string().required(),
          exposed_container_port: yup.string().required(),
          alb_name: yup.string().required(),
          alb_listener_port: yup.number().required(),
          protocol_version: yup.string(),
          health_check_path: yup.string(),
          healthy_threshold: yup.number(),
          unhealthy_threshold: yup.number(),
          interval: yup.number(),
          timeout: yup.number(),
          matcher: yup.string(),
          cookie_duration: yup.number(),
          certificate_arn: yup.string(),
          health_check_grace_period_seconds: yup.number(),
          deployment_minimum_healthy_percent: yup.number(),
        }),
      ),
    exposed_container_name: yup.string().when('exposed_ports', {
      is: (val) => val.length == 0,
      then: yup.string().required(),
    }),
    exposed_container_port: yup.string().when('exposed_ports', {
      is: (val) => val.length == 0,
      then: yup.string().required(),
    }),
    alb_name: yup.string().when('exposed_ports', {
      is: (val) => val.length == 0,
      then: yup.string().required(),
    }),
    alb_listener_port: yup.number().when('exposed_ports', {
      is: (val) => val.length == 0,
      then: yup.number().required(),
    }),
    protocol: yup.string().nullable(),
    certificate_arn: yup.string().nullable(),
    should_set_dns: yup.boolean(),
    health_check_path: yup.string(),
    matcher: yup.string(),
    deployment_minimum_healthy_percent: yup.number(),
    healthy_threshold: yup.number(),
    unhealthy_threshold: yup.number(),
    interval: yup.number(),
    timeout: yup.number(),
    containers: yup.array().of(
      yup.object().shape({
        name: yup.string().required(),
        image: yup.string(),
        is_essential: yup.boolean(),
        ports: yup.array().of(
          yup.object().shape({
            containerPort: yup.number(),
            hostPort: yup.number(),
          })
        ),
        cpu: yup.number().required(),
        memory: yup.number().required(),
        memoryReservation: yup.number().required(),
        retentionInDays: yup.number(),
        environmentVariables: yup.array().of(
          yup.object().shape({
            name: yup.string().required(),
            value: yup.string().required(),
          }),
        ),
      }),
    ).required(),
    repositoryUrl: yup.string().url().strict(),
    integrationName: yup.string(),
    branch: yup.string()
  });

	const handle = async () => {
    const { userId, accountId, environmentId } = res.locals;
    const providerName = res.locals.provider.backend.name;
    const { environmentName } = req.params;
  
    const newAppDetails = req.body;
  
    const isFirstVersion = req.originalUrl.endsWith('application/ecs') ? true : false;
    const isUpdate = req.method === 'PUT' ? true : false;
    let version = 0;
    if (!isFirstVersion) {
      version = req.params.version;
    }
  
    if (providerName !== constants.applicationProviders.aws) {
      return {
        success: false,
        error: {
          message: 'Invalid provider name',
          statusCode: constants.statusCodes.badRequest
        }
      }
    }
  
    // todo: check if the albId and clusterId are valid
    // todo: add validation
    let appVersion = {
      kind: constants.applicationKinds.ecs,
      createdBy: userId,
      ecs_cluster_name: newAppDetails.ecs_cluster_name,
      service_desired_count: newAppDetails.service_desired_count,
      memory: newAppDetails.memory,
      cpu: newAppDetails.cpu,
      task_role_arn: newAppDetails.task_role_arn,
      exposed_container_name: newAppDetails.exposed_container_name,
      exposed_container_port: newAppDetails.exposed_container_port,
      alb_name: newAppDetails.alb_name,
      alb_listener_port: newAppDetails.alb_listener_port,
      protocol: newAppDetails.protocol,
      certificate_arn: newAppDetails.certificate_arn,
      should_set_dns: newAppDetails.should_set_dns,
      health_check_path: newAppDetails.health_check_path,
      matcher: newAppDetails.matcher,
      containers: newAppDetails.containers,
      exposed_ports: newAppDetails.exposed_ports,
      jobName: newAppDetails.repositoryUrl ? `${req.body.app_name}-${environmentName}-${accountId}` : '',
      repositoryUrl: newAppDetails.repositoryUrl,
      integrationName: newAppDetails.integrationName,
      branch: newAppDetails.branch
    };

    const isDynamicApplication = newAppDetails.is_dynamic_application

    if (isUpdate) {
      appVersion.version = version;
    } else if (!isFirstVersion) {
      appVersion.fromVersion = version;
    }

    return isFirstVersion ?
      await EcsApplicationService.createEcsApplication(environmentId, newAppDetails.app_name, newAppDetails.description, isDynamicApplication, appVersion) :
      isUpdate ?
        await EcsApplicationService.updateEcsApplication(environmentId, newAppDetails.app_name, newAppDetails.description, appVersion) :
        await EcsApplicationService.addEcsApplicationVersion(environmentId, newAppDetails.app_name, newAppDetails.description, appVersion, version);
	};
  
  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = createOrUpdateEcsApplication;
