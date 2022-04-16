const { handleRequest } = require('../helpers');
const elasticacheService = require('../../db/models/elasticache_redis/elasticacheRedis.service');

async function getEcrResources(req, res) {
  const handle = async () => {
    const ecrName = req.params.ecrName;
    const environmentName = req.params.environmentName;
    const credentials = res.locals.credentials;
    const { bucketName, region } = res.locals.provider.backend;
    const fields = req.query.fields;

    return await elasticacheService.getEcrResources(
      environmentName,
      ecrName,
      credentials,
      region,
      bucketName,
      fields,
    );
  };
  const extractOutput = async (outputs) => outputs;

  return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getEcrResources;
