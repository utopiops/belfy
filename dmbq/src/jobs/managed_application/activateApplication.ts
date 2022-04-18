import Job from '../Job';
import config from '../../utils/config';

async function jobPromise(
  details: any,
  environmentName: string,
  environmentId: any,
  applicationName: string,
  kind: string,
  version: number,
): Promise<object> {
  return new Job({
    type: 'activate',
    description: 'application activation',
    url: `${config.coreUrl}/v3/applications/environment/name/${environmentName}/application/name/${applicationName}/activate`,
    method: 'post',
    body: {
      version,
    },
    collection: 'applications_v3',
    filter: {
      name: applicationName,
      environment: environmentId,
      kind: kind === 'ecs' ? 'ecs' : 's3_website',
      activeVersion: 1,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: applicationName,
    },
  });
}

export default jobPromise;
