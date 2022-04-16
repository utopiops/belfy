const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');

async function getApplicationDetailsForTF(req, res) {
	const handle = async () => {
    //todo: add validation
    const { environmentId } = res.locals;
    const { backend } = res.locals.provider;
    const { applicationName } = req.params
    const version = req.body.version || req.query.version;

		return await ApplicationService.getForTf(environmentId, applicationName, backend, version);
	};

  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getApplicationDetailsForTF;
