import Job from '../Job';
import config from '../../utils/config';

async function jobPromise(details: any, body: any): Promise<object> {
  return new Job({
    type: 'create',
    description: 'jenkins pipeline creation',
    url: `${config.coreUrl}/v3/applications/environment/name/${body.environmentName}/application/name/${body.applicationName}/pipeline`,
    method: 'POST',
    body: {
      dynamicName: body.dynamicName,
      accountId: details.accountId,
      userId: details.userId,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: body.applicationName,
    },
  });
}

export default jobPromise;
