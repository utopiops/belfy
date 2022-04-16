const { handleRequest } = require('../helpers');
const elasticacheService = require('../../db/models/elasticache_redis/elasticacheRedis.service');

async function listEnvironmentECRVersions(req, res) {
  const validationSchema = null;
  const handle = async () => {
    const ecrName = req.params.ecrName;
    const environmentId = res.locals.environmentId;
    return await elasticacheService.listEnvironmentECRVersions(environmentId, ecrName);
  };

  const extractOutput = async (outputs) => outputs;

  return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = listEnvironmentECRVersions;
