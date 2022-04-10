import Job from '../Job';
import config from '../../utils/config';

// todo: maybe change the inputs
async function jobPromise(details: any, domainName: string): Promise<object> {
  return new Job({
    type: 'create', // todo: add 'delete' job type
    description: 'domain delete',
    url: `${config.coreUrl}/domain/name/${domainName}`,
    method: 'delete',
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: domainName,
    },
  });
}

export default jobPromise;
