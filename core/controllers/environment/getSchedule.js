const AWSEnvironmentService = require('../../db/models/environment/awsEnvironment.service');
const { handleRequest } = require('../helpers');

async function getSchedule(req, res) {
	const { accountId, environmentName } = res.locals;
	const version = req.params.version;
	const validationSchema = null;

	const handle = async () => {
		return await AWSEnvironmentService.getSchedule(accountId, environmentName, version);
	};

	const extractOutput = (result) => (result);

	return await handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = getSchedule;
