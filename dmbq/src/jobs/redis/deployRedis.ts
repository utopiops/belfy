import Job from '../Job';
import config from '../../utils/config';
import { getEnvironmentId } from './helpers';

async function jobPromise(body: any, details: any): Promise<object> {
  return new Job({
    type: 'deploy',
    description: 'redis deployment',
    url: `${config.coreUrl}/elasticache/redis/environment/name/${body.environment_name}/ecr/name/${body.display_name}/deploy`,
    method: 'POST',
    body: {
      version: 1,
    },
    collection: 'elasticache_redis',
    filter: {
      environment: await getEnvironmentId(details.accountId, body.environment_name),
      display_name: body.display_name,
      deployedVersion: 1,
      'state.code': 'deployed',
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: body.display_name,
    },
  });
}

export default jobPromise;
