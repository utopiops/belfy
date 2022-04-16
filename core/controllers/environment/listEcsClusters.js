const AWSEnvironmentService = require('../../db/models/environment/awsEnvironment.service');
const { handleRequest } = require('../helpers');

async function listEcsClusters(req, res) {
	const name = req.params.name;
	const accountId = res.locals.accountId;
	const version = req.params.version;
	const validationSchema = null;

	const handle = async () => {
		return await AWSEnvironmentService.listEcsClusters(accountId, name, version);
	};

	const extractOutput = (result) => ({
		ecsClusterList: result.ecsClusterList
	});

	return await handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = listEcsClusters;
