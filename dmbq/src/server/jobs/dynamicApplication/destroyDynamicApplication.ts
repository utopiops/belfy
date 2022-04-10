import Job from '../Job';
import config from '../../utils/config';
import { getEnvironmentId } from './helpers';

async function jobPromise(details: any, body: any): Promise<object> {
  return new Job({
    type: 'deploy',
    description: 'dynamic application creation and deployment',
    url: `${config.coreUrl}/v3/applications/environment/name/${body.environmentName}/application/name/${body.applicationName}/destroy`,
    method: 'POST',
    body: {
      variables: {
        dynamicName: body.dynamicName,
      },
      accountId: details.accountId,
      userId: details.userId,
    },
    collection: 'applications_v3',
    filter: {
      environment: await getEnvironmentId(details.accountId, body.environmentName),
      name: body.applicationName,
      isDynamicApplication: true,
      $or: [
        { dynamicNames: { $elemMatch: { name: body.dynamicName, 'state.code': 'destroyed' } } },
        { 'dynamicNames.name': { $ne: body.dynamicName } },
      ],
    },
    details: {
      isDynamic: true,
      headers: details.headers,
      jobId: details.jobId,
      name: body.applicationName,
    },
  });
}

export default jobPromise;
