import Job from '../Job';
import config from '../../utils/config';
import defaults from './defaults';

async function jobPromise(details: any, environmentName: string, environmentVersion: number, protocol: string): Promise<object> {
  return new Job({
    type: 'create',
    description: `alb-listener creation for ${protocol}`,
    url: `${config.coreUrl}/v3/environment/name/${environmentName}/version/${environmentVersion}/alb/${defaults.albDisplayName}/listener`,
    method: 'patch',
    body: {
      // certificateArn will be added here in the fillerFunction
      port: protocol === 'https' ? 443 : 80,
      protocol,
    },
    collection: 'environment_v2', // todo: move to constants?
    filter: {
      accountId: details.accountId,
      name: environmentName,
      versions: {
        $elemMatch: {
          version: environmentVersion,
          'albList.listenerRules.port': { $eq: protocol === 'https' ? 443 : 80 },
          albList: { $elemMatch: { displayName: defaults.albDisplayName } },
        },
      },
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: environmentName,
    },
    dataBag: {
      environmentName,
      accountId: details.accountId,
    },
  });
}

export default jobPromise;
