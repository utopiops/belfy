const { handleRequest } = require('../helpers');
const elasticacheService = require('../../db/models/elasticache_redis/elasticacheRedis.service');
const yup = require('yup');

async function createOrUpdateECR(req, res, next) {
  const validationSchema = yup.object().shape({
    display_name: yup
      .string()
      .min(3, 'A minimum of 3 characters is required')
      .max(40, 'Maximum length is 40')
      .test('ecr-name', 'Invalid ecr name', (value) =>
        /^(?!.*--)[a-zA-Z]+[a-zA-Z0-9\-]*(?<!-)$/.test(value),
      )
      .lowercase()
      .strict()
      .required(),
    // we need better validation for the following fields
    engine_version: yup.string(),
    node_type: yup
      .string()
      .oneOf([
        'cache.m6g.large',
        'cache.m6g.xlarge',
        'cache.m6g.2xlarge',
        'cache.m6g.4xlarge',
        'cache.m6g.8xlarge',
        'cache.m6g.12xlarge',
        'cache.m6g.16xlarge',
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
        'cache.t1.micro',
        'cache.m1.small',
        'cache.m1.medium',
        'cache.m1.large',
        'cache.m1.xlarge',
        'cache.m3.medium',
        'cache.m3.large',
        'cache.m3.xlarge',
        'cache.m3.2xlarge',
        'cache.c1.xlarge',
        'cache.r6g.large',
        'cache.r6g.xlarge',
        'cache.r6g.2xlarge',
        'cache.r6g.4xlarge',
        'cache.r6g.8xlarge',
        'cache.r6g.12xlarge',
        'cache.r6g.16xlarge',
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
        'cache.m2.xlarge',
        'cache.m2.2xlarge',
        'cache.m2.4xlarge',
        'cache.r3.large',
        'cache.r3.xlarge',
        'cache.r3.2xlarge',
        'cache.r3.4xlarge',
        'cache.r3.8xlarge',
      ])
      .required(),
    is_cluster_mode_disabled: yup.boolean(),
    number_cache_clusters: yup.number(),
    replicas_per_node_group: yup.number().min(0).max(5),
    num_node_groups: yup.number(),
  });

  const handle = async () => {
    const userId = res.locals.userId;
    const environmentId = res.locals.environmentId;

    // We handle multiple endpoints with this controller, so here we try to find out which path it is
    const isFirstVersion = req.params.version == null;
    const isUpdate = req.method === 'PUT' ? true : false;
    let version = 0;
    if (!isFirstVersion) {
      version = req.params.version;
    }

    delete req.body.isActivated;

    let ecrVersion = {
      ...req.body,
      createdBy: userId,
    };

    if (isUpdate) {
      ecrVersion.version = version;
    } else if (!isFirstVersion) {
      ecrVersion.fromVersion = version;
    }

    return isFirstVersion
      ? await elasticacheService.createECR(environmentId, ecrVersion)
      : isUpdate
      ? await elasticacheService.updateECRVersion(environmentId, ecrVersion)
      : await elasticacheService.addECRVersion(environmentId, ecrVersion);
  };

  const extractOutput = async (outputs) => outputs;

  return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = createOrUpdateECR;
