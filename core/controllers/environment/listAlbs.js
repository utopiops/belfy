const AWSEnvironmentService = require('../../db/models/environment/awsEnvironment.service');
const { handleRequest } = require('../helpers');

async function listAlbs(req, res) {
	const accountId = res.locals.accountId;
	const name = req.params.name;
	const version = req.params.version;
	const validationSchema = null;

	const handle = async () => {
		return await AWSEnvironmentService.listAlbs(accountId, name, version);
	};

	const extractOutput = (result) => {
		console.log(result);
		return {
			albList: result.albList
		};
	};
	return await handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = listAlbs;
