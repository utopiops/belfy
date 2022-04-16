const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');

async function deleteDynamicApplication(req, res, next) {
	const handle = async () => {
    const { environmentId } = res.locals;
    const { applicationName, dynamicName } = req.params;
		return await ApplicationService.deleteDynamicApplication(environmentId, applicationName, dynamicName);
	};

	return handleRequest({ req, res, handle });
}

exports.handler = deleteDynamicApplication;
