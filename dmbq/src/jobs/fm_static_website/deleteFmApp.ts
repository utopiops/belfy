import Job from '../Job';
import config from '../../utils/config';

async function jobPromise(details: any, applicationName: string): Promise<object> {
  return new Job({
    type: 'create', // todo: add 'delete' job type
    description: 'application delete',
    url: `${config.coreUrl}/applications/utopiops/name/${applicationName}`,
    method: 'delete',
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: applicationName,
    },
  });
}

export default jobPromise;
