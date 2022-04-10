import Job from '../Job';
import config from '../../utils/config';

async function jobPromise(details: any, domainName: string): Promise<object> {
  return new Job({
    type: 'destroy',
    description: 'domain destroy',
    url: `${config.coreUrl}/domain/name/${domainName}/destroy`,
    method: 'post',
    collection: 'domains',
    filter: {
      accountId: details.accountId,
      domainName,
      'state.code': 'destroyed',
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: domainName,
    },
  });
}

export default jobPromise;
