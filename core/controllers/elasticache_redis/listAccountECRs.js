const { handleRequest } = require('../helpers');
const elasticacheService = require('../../db/models/elasticache_redis/elasticacheRedis.service');

async function listAccountECRs(req, res) {
  const handle = async () => {
    const accountId = res.locals.accountId;
    return await elasticacheService.listAccountECRs(accountId);
  };

  const extractOutput = async (outputs) => outputs;

  return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = listAccountECRs;
