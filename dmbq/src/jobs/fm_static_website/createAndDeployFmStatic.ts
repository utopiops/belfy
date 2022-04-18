import Job from '../Job';
import config from '../../utils/config';
import { getDomainId } from './helpers';

async function jobPromise(details: any, app: any): Promise<object> {
  return new Job({
    type: 'deploy',
    description: 'application creation and deployment',
    url: `${config.coreUrl}/applications/utopiops/application/custom-domain-static-website`,
    method: 'post',
    body: {
      name: app.name,
      domainName: app.domainName,
      branch: app.branch,
      repositoryUrl: app.repositoryUrl,
      buildCommand: app.buildCommand,
      integration_name: app.integration_name,
      outputPath: app.outputPath,
      integrationName: app.integrationName,
      description: app.description,
      index_document: app.index_document || 'index.html',
      error_document: app.error_document || 'error.html',
    },
    collection: 'utopiops_applications',
    filter: {
      accountId: details.accountId,
      name: app.name,
      domainId: await getDomainId(details.accountId, app.domainName),
      'state.code': 'deployed',
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: app.name,
    },
  });
}

export default jobPromise;
