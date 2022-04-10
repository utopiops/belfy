import Job from '../Job';
import config from '../../utils/config';
import defaults from './defaults';

async function jobPromise(details: any, environmentName: string, environmentVersion: number): Promise<object> {
  return new Job({
    type: 'create',
    description: 'instance-group creation',
    url: `${config.coreUrl}/v3/environment/name/${environmentName}/version/${environmentVersion}/ecs_cluster/name/${defaults.ecsClusterDisplayName}/instance_group`,
    method: 'put',
    body: {
      isSpot: !(environmentName === 'prod' || environmentName === 'production'),
      ...defaults.instanceGroup,
    },
    collection: defaults.collection,
    filter: {
      accountId: details.accountId,
      name: environmentName,
      versions: {
        $elemMatch: {
          version: environmentVersion,
          'ecsClusterList.instanceGroups.displayName': {
            $eq: defaults.instanceGroup.displayName,
          },
        },
      },
    },
    details: {
      headers: details.headers,
      jobId: details.jobId,
      name: environmentName,
    },
  });
}

export default jobPromise;
