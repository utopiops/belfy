import Job from '../Job';
import config from '../../utils/config';

async function jobPromise(details: any, domainName: string): Promise<object> {
  return new Job({
    type: 'create',
    description: 'domain creation',
    url: `${config.coreUrl}/domain`,
    method: 'POST',
    body: {
      domainName,
    },
    collection: 'domains',
    filter: {
      accountId: details.accountId,
      domainName,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: domainName,
    },
  });
}

export default jobPromise;
