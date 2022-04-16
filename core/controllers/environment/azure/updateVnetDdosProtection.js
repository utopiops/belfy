'use strict';
const { handleRequest } = require('../../helpers');
const yup = require('yup');
const AzureEnvironmentService = require('../../../db/models/environment/azureEnvironment.service');

async function updateVnetDdosProtection(req, res) {
	const validationSchema = yup.object().shape({
		enableVnetDdosProtection: yup.boolean().required()
	});

	const handle = async () => {
		const { accountId, environmentName } = res.locals;
		const version = req.params.version;
		const isAdd = req.method === 'PUT' ? false : true;
		const { enableVnetDdosProtection } = req.body;
		return await AzureEnvironmentService.updateVnetDdosProtection(accountId, environmentName, version, isAdd, enableVnetDdosProtection);
	};
	await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = updateVnetDdosProtection;
