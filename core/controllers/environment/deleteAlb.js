'use strict';
const { handleRequest } = require('../helpers');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');

async function deleteAlb(req, res) {
	const validationSchema = null;
	const handle = async () => {
		const { accountId, environmentName } = res.locals;
		const { version, albName } = req.params;
		const isAdd = req.query.mode === 'edit' ? false : true;
		return await AwsEnvironmentService.deleteAlb(accountId, environmentName, version, isAdd, albName);
	};
	await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = deleteAlb;
