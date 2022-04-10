import Job from '../Job';
import config from '../../utils/config';

async function jobPromise(details: any, environmentName: string, applicationName: string, kind: string): Promise<object> {
  return new Job({
    type: 'create',
    description: 'pipeline creation',
    url: `${config.coreUrl}/v3/applications/environment/name/${environmentName}/application/name/${applicationName}/pipeline`,
    method: 'post',
    body: {
      kind,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: applicationName,
    },
  });
}

export default jobPromise;
