import Job from '../Job';
import config from '../../utils/config';
import { getEnvironmentId } from './helpers';

// todo: maybe change the inputs
async function jobPromise(details: any, environmentName: string, databaseName: string, version: number): Promise<object> {
  return new Job({
    type: 'activate',
    description: 'activate database',
    url: `${config.coreUrl}/v3/database/environment/name/${environmentName}/database/name/${databaseName}/activate`,
    method: 'post', // todo: lowercase! make it consistent
    body: {
      version,
    },
    collection: 'database_server_v2',
    filter: {
      name: databaseName,
      environment: await getEnvironmentId(details.accountId, environmentName),
      activeVersion: version,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: databaseName,
    },
  });
}

export default jobPromise;
