import Job from '../Job';
import config from '../../utils/config';

async function jobPromise(details: any, environmentName: string, version: number): Promise<object> {
  return new Job({
    type: 'activate',
    description: 'environment activation',
    url: `${config.coreUrl}/v3/environment/name/${environmentName}/activate`,
    method: 'post',
    body: {
      version,
    },
    collection: 'environment_v2',
    filter: {
      name: environmentName,
      accountId: details.accountId,
      activeVersion: version,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: environmentName,
    },
  });
}

export default jobPromise;
