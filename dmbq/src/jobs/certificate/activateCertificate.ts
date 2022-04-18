import Job from '../Job';
import defaults from './defaults';

async function jobPromise(details: any, environmentName: string, environmentId: string, region: string): Promise<object> {
  return new Job({
    type: 'activate',
    description: 'certificate activation',
    url: '',
    method: 'post',
    collection: 'ssl_tls_certificate_v2',
    filter: {
      domainName: defaults.domainName,
      environment: environmentId,
      // identifier: certificateIdentifier,
      activeVersion: 1,
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: environmentName,
    },
    dataBag: {
      environmentName,
      environmentId,
      region,
    },
  });
}

export default jobPromise;
