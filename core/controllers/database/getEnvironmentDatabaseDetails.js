const { handleRequest } = require('../helpers');
const DatabaseService = require('../../db/models/database/database.service');

async function getEnvironmentDatabaseDetails(req, res) {
	const validationSchema = null;
	const handle = async () => {
		const databaseName = req.params.name;
		const version = req.params.version;
		const environmentId = res.locals.environmentId;
		return await DatabaseService.getEnvironmentDatabaseDetails(environmentId, databaseName, version);
	};
	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = getEnvironmentDatabaseDetails;
