import Job from '../Job';
import config from '../../utils/config';

async function jobPromise(details: any, domainName: string): Promise<object> {
  return new Job({
    type: 'deploy',
    description: 'domain deployment',
    url: `${config.coreUrl}/domain/name/${domainName}/deploy`,
    method: 'post',
    collection: 'domains',
    filter: {
      accountId: details.accountId,
      domainName,
      'state.code': 'deployed',
    },
    details: {
      // todo: this is getting repeated in every job, handle it somehow
      headers: details.headers,
      jobId: details.jobId,
      name: domainName,
    },
  });
}

export default jobPromise;
