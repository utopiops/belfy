/* eslint-disable object-curly-newline */ // todo: remove all eslint-disables
import environmentDefaults from '../environment/defaults';

const s3Application = {
  description: 'a flash-setup application',
  redirect_acm_certificate_arn: '',
  redirect_to_www: false,
  index_document: 'index.html',
  error_document: 'error.html',
  release_version: '',
  isDynamicApplication: false,
  collection: 'applications_v3',
};

const ecsApplication = {
  service_autoscaling: null,
  memory: null,
  cpu: null,
  description: 'a flash-setup application',
  task_role_arn: null,
  is_dynamic_application: false,
  service_desired_count: '1',
  containers: {
    name: 'main',
    retentionInDays: 1,
    is_essential: true,
    image: '',
    cpu: '128',
    memory: '256',
    environmentVariables: [],
    memoryReservation: '127',
    hostPort: '0',
  },
  exposed_ports: {
    health_check_path: '/health',
    protocol_version: 'HTTP1',
    matcher: '200-299',
    domain_suffix: '',
    alb_name: environmentDefaults.albDisplayName,
    exposed_container_name: 'main',
  },
  ecs_cluster_name: environmentDefaults.ecsClusterDisplayName,
  collection: 'applications_v3',
};

export { s3Application, ecsApplication };
