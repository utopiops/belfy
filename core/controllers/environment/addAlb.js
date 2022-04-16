'use strict';
const { handleRequest } = require('../helpers');
const yup = require('yup');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');

async function addAlb(req, res) {
	const validationSchema = yup.object().shape({
		displayName: yup.string().required(),
    is_internal: yup.boolean(),
		enable_waf: yup.boolean()
	});

	const handle = async () => {
		const { accountId, environmentName } = res.locals;
		const version = req.params.version;
		const isAdd = req.method === 'PUT' ? false : true;
		const { displayName, is_internal, enable_waf } = req.body;
		return await AwsEnvironmentService.addAlb(accountId, environmentName, version, isAdd, displayName, is_internal, enable_waf);
	};
	await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = addAlb;
