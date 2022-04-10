import Job from '../Job';
import config from '../../utils/config';

async function jobPromise(details: any, applicationName: string): Promise<object> {
  return new Job({
    type: 'create',
    description: 'application pipeline creation',
    url: `${config.coreUrl}/applications/utopiops/name/${applicationName}/pipeline`,
    method: 'post',
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: applicationName,
    },
  });
}

export default jobPromise;
