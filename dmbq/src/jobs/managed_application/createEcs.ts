/* eslint-disable indent */
import Job from '../Job';
import config from '../../utils/config';
import { ecsApplication as defaults } from './defaults';

function setContainers(app: any) {
  return !app.containers || app.containers.length === 1 // flash-setup || quick mode (we complete missing parts here)
    ? [
        {
          ...defaults.containers,
          ports: [
            {
              containerPort: app.port || app.containers[0].ports[0].containerPort,
              hostPort: defaults.containers.hostPort,
            },
          ],
          ...app.containers?.[0],
        },
      ]
    : app.containers; // advanced mode (we pass it as is)
}

function setExposedPorts(app: any, legitimateAlb: any) {
  return !app.exposed_ports || app.exposed_ports.length === 1 // flash-setup || quick mode (we complete missing parts here)
    ? [
        {
          ...defaults.exposed_ports,
          alb_name: legitimateAlb ? legitimateAlb.displayName : defaults.exposed_ports.alb_name,
          alb_listener_port: app.protocol === 'http' ? 80 : 443,
          exposed_container_port: app.port,
          ...app.exposed_ports?.[0],
        },
      ]
    : app.exposed_ports; // advanced mode (we pass it as is)
}

async function jobPromise(
  details: any,
  environmentName: string,
  environmentId: string,
  app: any,
  legitimateAlb: any,
  legitimateCluster: any,
): Promise<object> {
  return new Job({
    type: 'create',
    description: 'ecs application creation',
    url: `${config.coreUrl}/v3/applications/environment/name/${environmentName}/application/ecs`,
    method: 'post',
    body: {
      repositoryUrl: app.repositoryUrl,
      integrationName: app.integrationName,
      branch: app.branch,
      service_autoscaling: app.service_autoscaling || defaults.service_autoscaling,
      memory: app.memory || defaults.memory,
      cpu: app.cpu || defaults.cpu,
      description: app.description || defaults.description,
      task_role_arn: app.task_role_arn || defaults.task_role_arn,
      is_dynamic_application: app.is_dynamic_application || defaults.is_dynamic_application,
      service_desired_count: app.service_desired_count || defaults.service_desired_count,
      containers: setContainers(app),
      exposed_ports: setExposedPorts(app, legitimateAlb),
      app_name: app.name,
      ecs_cluster_name: app.ecs_cluster_name || legitimateCluster ? legitimateCluster.displayName : defaults.ecs_cluster_name,
    },
    collection: defaults.collection,
    filter: {
      name: app.name,
      environment: environmentId,
      kind: 'ecs',
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: app.name,
    },
  });
}

export default jobPromise;
