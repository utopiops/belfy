const { handleRequest } = require('../helpers');
const AzureStaticWebsiteApplicationService = require('../../db/models/application/azureStaticWebsiteApplication.service');
const constants = require('../../utils/constants');

async function checkAzureHttpsDisabled(req, res, next) {
	const handle = async () => {
    const { userId, environmentId } = res.locals;
    const { applicationName } = req.params
		return await AzureStaticWebsiteApplicationService.checkAzureHttpsDisabled(userId, environmentId, applicationName);
	};

	return handleRequest({ req, res, handle });
}

exports.handler = checkAzureHttpsDisabled;
