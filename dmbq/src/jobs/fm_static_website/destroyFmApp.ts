import Job from '../Job';
import config from '../../utils/config';

async function jobPromise(details: any, applicationName: string): Promise<object> {
  return new Job({
    type: 'destroy',
    description: 'application destroy',
    url: `${config.coreUrl}/applications/utopiops/name/${applicationName}/destroy`,
    method: 'post',
    collection: 'utopiops_applications',
    filter: {
      accountId: details.accountId,
      name: applicationName,
      'state.code': 'destroyed',
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: applicationName,
    },
  });
}

export default jobPromise;
