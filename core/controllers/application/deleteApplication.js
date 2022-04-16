const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');

async function deleteApplication(req, res, next) {
	const handle = async () => {
    const { userId, environmentId, accountId, environmentName } = res.locals;
    const { applicationName } = req.params
		return await ApplicationService.deleteApplication(accountId, userId, environmentId, environmentName, applicationName, res.locals.headers);
	};

	return handleRequest({ req, res, handle });
}

exports.handler = deleteApplication;
