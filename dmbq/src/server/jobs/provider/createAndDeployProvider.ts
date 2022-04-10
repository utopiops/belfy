import Job from '../Job';
import config from '../../utils/config';

async function jobPromise(
  details: any,
  providerName: string,
  region: string,
  accessKeyId: string,
  secretAccessKey: string,
): Promise<object> {
  return new Job({
    type: 'deploy',
    description: 'provider creation and deployment',
    url: `${config.coreUrl}/v3/provider/aws`,
    method: 'post',
    body: {
      displayName: providerName,
      region,
      accessKeyId,
      secretAccessKey,
    },
    collection: 'providers',
    filter: {
      displayName: providerName,
      accountId: details.accountId,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: providerName,
    },
  });
}

export default jobPromise;
