const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');

async function listApplicationVersions(req, res) {
	const handle = async () => {
    const { environmentId } = res.locals;
    const { applicationName } = req.params;

		return await ApplicationService.listApplicationVersions(environmentId, applicationName);
	};

  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = listApplicationVersions;
