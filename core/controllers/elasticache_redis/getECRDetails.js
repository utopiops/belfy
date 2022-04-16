const { handleRequest } = require('../helpers');
const elasticacheService = require('../../db/models/elasticache_redis/elasticacheRedis.service');

async function getEnvironmentECRDetails(req, res) {
  const validationSchema = null;
  const handle = async () => {
    const ecrName = req.params.ecrName;
    const version = req.params.version;
    const environmentId = res.locals.environmentId;
    return await elasticacheService.getECRDetails(environmentId, ecrName, version);
  };
  const extractOutput = async (outputs) => outputs;

  return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = getEnvironmentECRDetails;
