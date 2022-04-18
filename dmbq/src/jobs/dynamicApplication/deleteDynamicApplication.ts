import Job from '../Job';
import config from '../../utils/config';
import { getEnvironmentId } from './helpers';

async function jobPromise(details: any, body: any): Promise<object> {
  return new Job({
    type: 'delete',
    description: 'dynamic application deletion',
    url: `${config.coreUrl}/v3/applications/environment/name/${body.environmentName}/application/name/${body.applicationName}/dynamic/name/${body.dynamicName}?accountId=${details.accountId}`,
    method: 'delete',
    collection: 'applications_v3',
    filter: {
      environment: await getEnvironmentId(details.accountId, body.environmentName),
      name: body.applicationName,
      isDynamicApplication: true,
      'dynamicNames.name': { $ne: body.dynamicName },
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: body.applicationName,
    },
  });
}

export default jobPromise;
