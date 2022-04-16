const { handleRequest } = require('../helpers');
const DatabaseService = require('../../db/models/database/database.service');

async function listEnvironmentDatabases(req, res) {
	const validationSchema = null;

	const handle = async () => {
		const environmentId = res.locals.environmentId;
		return await DatabaseService.listEnvironmentDatabases(environmentId);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = listEnvironmentDatabases;
