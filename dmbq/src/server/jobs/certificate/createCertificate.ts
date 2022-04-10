import Job from '../Job';
import config from '../../utils/config';
import defaults from './defaults';

async function jobPromise(details: any, environmentName: string, environmentId: string, region: string): Promise<object> {
  return new Job({
    type: 'create',
    description: 'certificate creation',
    url: `${config.coreUrl}/v2/ssl_tls/environment/name/${environmentName}/certificate`,
    method: 'post',
    body: {
      domainName: defaults.domainName,
      subjectAlternativeNames: defaults.subjectAlternativeNames,
      region,
    },
    collection: defaults.collection,
    filter: {
      domainName: defaults.domainName,
      environment: environmentId,
      region,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: environmentName,
    },
  });
}

export default jobPromise;
