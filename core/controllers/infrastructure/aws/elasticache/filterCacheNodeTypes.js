exports.filterCacheNodeTypes = (engineVersion) => {
  let nodeTypes = [
    'cache.m5.large',
    'cache.m5.xlarge',
    'cache.m5.2xlarge',
    'cache.m5.4xlarge',
    'cache.m5.12xlarge',
    'cache.m5.24xlarge',
    'cache.m4.large',
    'cache.m4.xlarge',
    'cache.m4.2xlarge',
    'cache.m4.4xlarge',
    'cache.m4.10xlarge',
    'cache.t3.micro',
    'cache.t3.small',
    'cache.t3.medium',
    'cache.t2.micro',
    'cache.t2.small',
    'cache.t2.medium',
    'cache.r5.large',
    'cache.r5.xlarge',
    'cache.r5.2xlarge',
    'cache.r5.4xlarge',
    'cache.r5.12xlarge',
    'cache.r5.24xlarge',
    'cache.r4.large',
    'cache.r4.xlarge',
    'cache.r4.2xlarge',
    'cache.r4.4xlarge',
    'cache.r4.8xlarge',
    'cache.r4.16xlarge',
  ];

  if (engineVersion >= '5.0.6') {
    nodeTypes.push(
      'cache.m6g.large',
      'cache.m6g.xlarge',
      'cache.m6g.2xlarge',
      'cache.m6g.4xlarge',
      'cache.m6g.8xlarge',
      'cache.m6g.12xlarge',
      'cache.m6g.16xlarge',
      'cache.r6g.large',
      'cache.r6g.xlarge',
      'cache.r6g.2xlarge',
      'cache.r6g.4xlarge',
      'cache.r6g.8xlarge',
      'cache.r6g.12xlarge',
      'cache.r6g.16xlarge',
    );
  }
  if (engineVersion >= '6.0') {
    nodeTypes.push('cache.t4g.micro', 'cache.t4g.small', 'cache.t4g.medium');
  }
  if (engineVersion >= '6.2') {
    nodeTypes.push(
      'cache.r6gd.xlarge',
      'cache.r6gd.2xlarge',
      'cache.r6gd.4xlarge',
      'cache.r6gd.8xlarge',
      'cache.r6gd.12xlarge',
      'cache.r6gd.16xlarge',
    );
  }

  return nodeTypes;
};
