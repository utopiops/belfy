const { handleRequest } = require('../helpers');
const elasticacheService = require('../../db/models/elasticache_redis/elasticacheRedis.service');
const yup = require('yup');

async function activateECR(req, res, next) {
  const validationSchema = yup.object().shape({
    version: yup.number().required(),
  });

  const handle = async () => {
    const ecrName = req.params.ecrName;
    const userId = res.locals.userId;
    const environmentId = res.locals.environmentId;
    const version = req.body.version;
    return await elasticacheService.activate(userId, environmentId, ecrName, Number(version));
  };

  return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = activateECR;
