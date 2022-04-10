import Job from '../Job';
import config from '../../utils/config';
import { getEnvironmentId } from './helpers';

// class CreateRedis extends Job {
//   constructor(body: any) {
//     super({
//       type: 'create',
//       description: 'create redis instance',
//       url: `${config.coreUrl}/elasticache/redis/environment/name/${body.environmentName}/ecr`,
//       method: 'POST',
//       body: {
//         display_name: body.display_name,
//         engine_version: body.engine_version,
//         node_type: body.node_type,
//         is_cluster_mode_disabled: body.is_cluster_mode_disabled,
//         number_cache_clusters: body.number_cache_clusters,
//         replicas_per_node_group: body.replicas_per_node_group,
//         num_node_groups: body.num_node_groups,
//       },
//       collection: 'domains',
//       filter: {
//         environment: await getEnvironmentId(accountId, body.environment_name),
//         display_name: body.display_name,
//       },
//     });
//   }
// }

// export default CreateRedis;

async function jobPromise(body: any, details: any): Promise<object> {
  return new Job({
    type: 'create',
    description: 'create redis instance',
    url: `${config.coreUrl}/elasticache/redis/environment/name/${body.environment_name}/ecr`,
    method: 'POST',
    body: {
      display_name: body.display_name,
      engine_version: body.engine_version,
      node_type: body.node_type,
      is_cluster_mode_disabled: body.is_cluster_mode_disabled,
      number_cache_clusters: body.number_cache_clusters,
      replicas_per_node_group: body.replicas_per_node_group,
      num_node_groups: body.num_node_groups,
    },
    collection: 'elasticache_redis',
    filter: {
      environment: await getEnvironmentId(details.accountId, body.environment_name),
      display_name: body.display_name,
    },
    // todo: its a dumb solution tbh, get rid of it.
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: body.display_name,
    },
  });
}

// const job = new Job({
//   type: 'create',
//   description: 'create redis',
//   url: 'https://api.cloudflare.com/client/v4/zones',
//   method: 'POST',
//   body: {
//     name: 'example.com',
//     status: 'active',
//     paused: false,
//     type: 'full',
//     development_mode: false,
//     owner: {
//       id: '123456789',
//     },
//   },
//   collection: 'domains',
//   filter: {
//     name: 'example.com',
//   },
// });

export default jobPromise;
