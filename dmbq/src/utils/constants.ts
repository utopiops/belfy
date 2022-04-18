const constants = {
  statusCodes: {
    badRequest: 400,
    duplicate: 409,
    ise: 500,
    notFound: 404,
    notAuthorized: 401,
    ok: 200,
    accepted: 202,
    partialSuccess: 206,
    ue: 422,
  },

  jobStatus: {
    complete: 'complete',
    created: 'created',
    processing: 'processing',
    failed: 'failed',
    timeout: 'timeout',
  },

  jobConfigs: {
    flashSetup: {
      path: 'flashSetup/run',
      title: 'Flash Setup',
    },
    domainSetup: {
      path: 'domainSetup/run',
      title: 'Domain Setup',
    },
    utopiopsStaticSetup: {
      path: 'utopiopsStaticSetup/run',
      title: 'utopiops static website Setup',
    },
    redisSetup: {
      path: 'redisSetup/run',
      title: 'elasticache redis Setup',
    },
    dynamicSetup: {
      path: 'dynamicSetup/run',
      title: 'dynamic application Setup',
    },
    dynamicRemove: {
      path: 'dynamicRemove/run',
      title: 'dynamic application Remove',
    },
    databaseSetup: {
      path: 'databaseSetup/run',
      title: 'rds database Setup',
    },
  },
};

export default constants;
