const elasticacheService = require('../../db/models/elasticache_redis/elasticacheRedis.service');
const { handleRequest } = require('../helpers');
const yup = require('yup');

async function deployECR(req, res) {
  const validationSchema = yup.object().shape({
    accessKeyId: yup.string(),
    secretAccessKey: yup.string(),
    version: yup.number(),
  });

  const handle = async () => {
    return await elasticacheService.tfActionECR('deploy', req, res);
  };

  const extractOutput = async (outputs) => outputs;

  return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = deployECR;
