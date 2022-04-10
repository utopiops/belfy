import Job from '../Job';
import config from '../../utils/config';
import defaults from './defaults';

async function jobPromise(details: any, providerName: string, region: string, environment: any): Promise<object> {
  return new Job({
    type: 'create',
    description: 'environment creation',
    url: `${config.coreUrl}/v3/environment`,
    method: 'post',
    body: {
      providerId: '',
      name: environment.name,
      region,
      description: environment.description,
      providerName,
      domain: environment.domain,
    },
    collection: defaults.collection,
    filter: {
      name: environment.name,
      accountId: details.accountId,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: environment.name,
    },
    dataBag: {
      accountId: details.accountId,
      providerName,
    },
  });
}

export default jobPromise;
