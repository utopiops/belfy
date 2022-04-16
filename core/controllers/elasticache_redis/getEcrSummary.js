const { handleRequest } = require('../helpers');
const elasticacheService = require('../../db/models/elasticache_redis/elasticacheRedis.service');

async function getEcrSummary(req, res) {
	const handle = async () => {
    const { environmentId } = res.locals;
    const { ecrName } = req.params

		return await elasticacheService.getEcrSummary(environmentId, ecrName);
	};

  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getEcrSummary;
