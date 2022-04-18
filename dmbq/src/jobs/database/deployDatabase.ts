import Job from '../Job';
import config from '../../utils/config';
import { getEnvironmentId } from './helpers';

async function jobPromise(details: any, environmentName: any, databaseName: any, version: any): Promise<object> {
  return new Job({
    type: 'deploy',
    description: 'deploy database',
    url: `${config.coreUrl}/v3/database/environment/name/${environmentName}/database/name/${databaseName}/deploy`,
    method: 'post',
    body: {},
    collection: 'database_server_v2',
    filter: {
      name: databaseName,
      environment: await getEnvironmentId(details.accountId, environmentName),
      deployedVersion: version,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: databaseName,
    },
  });
}

export default jobPromise;
