/* eslint-disable object-curly-newline */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */

import mongoose from 'mongoose';
import axios from 'axios';
import config from '../utils/config';
import certificateDefaults from '../jobs/certificate/defaults';

const { ObjectId } = mongoose.Types;

// todo: update type definitions

async function getEnvironmentDns(accountId: string, environmentName: any) {
  return mongoose.connection.db
    .collection('environment_v2')
    .findOne({ accountId: new ObjectId(accountId), name: environmentName }, { projection: { domain: 1 } })
    .then((result) => result?.domain.dns);
}

export async function setCertificateIdentifier(job: any) {
  const { environmentName, environmentId, region } = job.dataBag;

  const certificateIdentifier = await mongoose.connection.db
    .collection('ssl_tls_certificate_v2')
    .findOne({
      domainName: '*',
      environment: new ObjectId(environmentId),
      region: region || null,
    })
    .then((result) => result?.identifier);

  // eslint-disable-next-line operator-linebreak
  job.url = // todo: improve this
    job.type === 'activate'
      ? `${config.coreUrl}/v2/ssl_tls/environment/name/${environmentName}/certificate/identifier/${certificateIdentifier}/version/1/activate`
      : `${config.coreUrl}/v2/ssl_tls/environment/name/${environmentName}/certificate/identifier/${certificateIdentifier}/deploy`;
  job.filter!.identifier = certificateIdentifier;
}

export async function setProviderId(job: any) {
  const { accountId, providerName } = job.dataBag;

  const providerId = await mongoose.connection.db
    .collection('providers')
    .findOne({ accountId: new ObjectId(accountId), displayName: providerName })
    .then((result) => new ObjectId(result!._id));

  job.body.providerId = providerId;
}

// todo: consider refactoring
export async function setCertificateArn(job: any) {
  const { environmentName, accountId } = job.dataBag;
  const dns = await getEnvironmentDns(accountId, environmentName);
  const domainName = `*.${dns}`;

  const result = await axios({
    method: 'get',
    url: `${config.coreUrl}/v2/inf/aws/acm/listCertificatesByEnvironmentName/${environmentName}`,
    params: {
      region: job.description === 'static-website application creation' ? certificateDefaults.region : undefined,
    },
    headers: job.details.headers,
  });

  console.log('🚀 ~ file: helperFunctions.ts ~ line 72 ~ setCertificateArn ~ result.data', result.data);
  const certificateArn = result.data.find((cert: { domainName: string }) => cert.domainName === domainName).arn;

  job.body.certificateArn = certificateArn; // ecs
  job.body.acm_certificate_arn = certificateArn; // s3
}
