/* eslint-disable object-curly-newline */ // todo: remove all eslint-disables
const environment = {
  description: 'a flash-setup environment',
  isOwn: true,
  albDisplayName: 'main',
  ecsClusterDisplayName: 'main',
  instanceGroup: {
    instances: [{ weightedCapacity: 1, instanceType: 't3.small' }],
    displayName: 'ig1',
    minSize: '0',
    maxSize: '2',
    count: '1',
    rootVolumeSize: '30',
  },
  collection: 'environment_v2',
};

export default environment;
