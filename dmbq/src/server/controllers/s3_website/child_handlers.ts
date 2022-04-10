/* eslint-disable import/prefer-default-export */
// child jobs
import certificateSetup from '../certificate/setup';
import certificateDefaults from '../../jobs/certificate/defaults';

export async function handleCertificate(req: any, res: any, queueName: any, body: any) {
  const certHandler = await certificateSetup(req, res);
  const { flow: certFlow } = await certHandler(queueName, {
    body: {
      environmentName: body.environmentName,
      environmentId: body.environmentId,
      region: certificateDefaults.region,
    },
  });
  return certFlow.job;
}
