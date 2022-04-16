const { handleRequest } = require('../helpers');
const DatabaseService = require('../../db/models/database/database.service');

async function listEnvironmentDatabaseVersions(req, res) {
	const validationSchema = null;
	const handle = async () => {
		const databaseName = req.params.name;
		const environmentId = res.locals.environmentId;
		return await DatabaseService.listEnvironmentDatabaseVersions(environmentId, databaseName);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = listEnvironmentDatabaseVersions;
