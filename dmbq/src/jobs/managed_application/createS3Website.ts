import Job from '../Job';
import config from '../../utils/config';
import { s3Application as defaults } from './defaults';

async function jobPromise(details: any, environmentName: string, environmentId: any, app: any): Promise<object> {
  return new Job({
    type: 'create',
    description: 'static-website application creation',
    url: `${config.coreUrl}/v3/applications/environment/name/${environmentName}/application/s3web`,
    method: 'post',
    body: {
      app_name: app.name,
      description: app.description || defaults.description,
      // acm_certificate_arn will be added in the fillerFunction
      redirect_acm_certificate_arn: app.redirect_acm_certificate_arn || defaults.redirect_acm_certificate_arn,
      redirect_to_www: app.redirect_to_www || defaults.redirect_to_www,
      index_document: app.index_document || defaults.index_document,
      error_document: app.error_document || defaults.error_document,
      release_version: app.release_version || defaults.release_version,
      isDynamicApplication: app.isDynamicApplication || defaults.isDynamicApplication,
      repositoryUrl: app.repositoryUrl,
      integrationName: app.integrationName,
      buildCommand: app.buildCommand,
      outputPath: app.outputPath,
      branch: app.branch,
    },
    collection: 'applications_v3',
    filter: {
      name: app.name,
      environment: environmentId,
      kind: 's3_website',
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: app.name,
    },
    dataBag: {
      environmentName,
      accountId: details.accountId,
    },
  });
}

export default jobPromise;
