const { handleRequest } = require('../helpers');
const elasticacheService = require('../../db/models/elasticache_redis/elasticacheRedis.service');

async function deleteECR(req, res) {
  const handle = async () => {
    const ecrName = req.params.ecrName;
    const userId = res.locals.userId;
    const environmentId = res.locals.environmentId;
    return await elasticacheService.deleteECR(userId, environmentId, ecrName);
  };

  return handleRequest({ req, res, handle });
}

exports.handler = deleteECR;
