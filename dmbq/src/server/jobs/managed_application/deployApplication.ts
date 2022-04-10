import Job from '../Job';
import config from '../../utils/config';

async function jobPromise(
  details: any,
  environmentName: string,
  environmentId: string,
  applicationName: string,
  version: number,
): Promise<object> {
  return new Job({
    type: 'deploy',
    description: 'application deployment',
    url: `${config.coreUrl}/v3/applications/environment/name/${environmentName}/application/name/${applicationName}/deploy`,
    method: 'post',
    collection: 'applications_v3',
    filter: {
      name: applicationName,
      environment: environmentId,
      'state.code': 'deployed',
      deployedVersion: version,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: applicationName,
    },
  });
}

export default jobPromise;
