const { handleRequest } = require('../helpers');
const elasticacheService = require('../../db/models/elasticache_redis/elasticacheRedis.service');
const yup = require('yup');

async function setECRState(req, res) {
  const validationSchema = yup.object().shape({
    code: yup
      .string()
      .oneOf(['deployed', 'deploy_failed', 'destroyed', 'destroy_failed'])
      .required(),
    job: yup.string().required(),
  });
  const handle = async () => {
    const ecrName = req.params.ecrName;
    const environmentId = res.locals.environmentId;
    const state = req.body;

    return await elasticacheService.setState(environmentId, ecrName, state);
  };
  return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = setECRState;
