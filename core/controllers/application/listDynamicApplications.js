const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');

async function listDynamicApplications(req, res) {
	const handle = async () => {
    const { environmentId } = res.locals;
    const { applicationName } = req.params;
		return await ApplicationService.listDynamicApplications(environmentId, applicationName);
	};

  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = listDynamicApplications;
