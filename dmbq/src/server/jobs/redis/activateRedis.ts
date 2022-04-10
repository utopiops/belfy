import Job from '../Job';
import config from '../../utils/config';
import { getEnvironmentId } from './helpers';

// todo: decide between camelCase and snake_case. make it consistent.

async function jobPromise(body: any, details: any): Promise<object> {
  return new Job({
    type: 'activate',
    description: 'redis version activation',
    url: `${config.coreUrl}/elasticache/redis/environment/name/${body.environment_name}/ecr/name/${body.display_name}/activate`,
    method: 'POST',
    body: {
      version: 1,
    },
    collection: 'elasticache_redis',
    filter: {
      environment: await getEnvironmentId(details.accountId, body.environment_name),
      display_name: body.display_name,
      activeVersion: 1,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: body.display_name,
    },
  });
}

export default jobPromise;
