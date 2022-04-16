const { handleRequest } = require('../helpers');
const DatabaseService = require('../../db/models/database/database.service');

async function getDatabaseKind(req, res) {
	const validationSchema = null;

	const handle = async () => {
		const environmentId = res.locals.environmentId;
		const databaseName = req.params.databaseName;
		return await DatabaseService.getKind(environmentId, databaseName);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = getDatabaseKind;
