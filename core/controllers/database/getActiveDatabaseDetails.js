const { handleRequest } = require('../helpers');
const DatabaseService = require('../../db/models/database/database.service');

async function getActiveDatabaseDetails(req, res, next) {
	const validationSchema = null;

	const handle = async () => {
		const databaseName = req.params.databaseName;
		const environmentId = res.locals.environmentId;
		const version = req.query.version;
		return await DatabaseService.getForTf(environmentId, databaseName, version);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = getActiveDatabaseDetails;
