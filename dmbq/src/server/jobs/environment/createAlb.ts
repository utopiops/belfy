import Job from '../Job';
import config from '../../utils/config';
import defaults from './defaults';

async function jobPromise(
  details: any,
  environmentName: string,
  environmentVersion: number,
  isNewVersion: boolean,
): Promise<object> {
  return new Job({
    type: 'create',
    description: 'alb creation',
    url: `${config.coreUrl}/v3/environment/name/${environmentName}/version/${environmentVersion}/alb`,
    method: isNewVersion ? 'put' : 'post',
    body: {
      displayName: defaults.albDisplayName,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: environmentName,
    },
  });
}

export default jobPromise;
