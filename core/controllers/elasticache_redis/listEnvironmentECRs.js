const { handleRequest } = require('../helpers');
const elasticacheService = require('../../db/models/elasticache_redis/elasticacheRedis.service');

async function listEnvironmentECRs(req, res) {
  const validationSchema = null;

  const handle = async () => {
    const environmentId = res.locals.environmentId;
    return await elasticacheService.listEnvironmentECRs(environmentId);
  };

  const extractOutput = async (outputs) => outputs;

  return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = listEnvironmentECRs;
