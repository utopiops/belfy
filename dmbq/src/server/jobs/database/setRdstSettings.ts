import Job from '../Job';
import config from '../../utils/config';

async function jobPromise(details: any, environmentName: string, databaseName: string): Promise<object> {
  return new Job({
    type: 'create',
    description: 'set RDST settings',
    url: `${config.rdstUrl}/rds/environment/name/${environmentName}/database/name/${databaseName}/settings`,
    method: 'post',
    body: {},
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: databaseName,
    },
  });
}

export default jobPromise;
