import Job from '../Job';
import config from '../../utils/config';
import defaults from './defaults';

async function jobPromise(details: any, environmentName: string, version: number): Promise<object> {
  return new Job({
    type: 'deploy',
    description: 'environment deployment',
    url: `${config.coreUrl}/v3/environment/name/${environmentName}/deploy`,
    method: 'post',
    collection: defaults.collection,
    filter: {
      name: environmentName,
      accountId: details.accountId,
      deployedVersion: version,
      'state.code': 'deployed',
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: environmentName,
    },
  });
}

export default jobPromise;
