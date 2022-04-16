const { handleRequest } = require('../helpers');
const DatabaseService = require('../../db/models/database/database.service');

async function deleteDatabase(req, res) {
	const handle = async () => {
		const databaseName = req.params.databaseName;
		const userId = res.locals.userId;
		const environmentId = res.locals.environmentId;
		return await DatabaseService.deleteDatabase(userId, environmentId, databaseName);
	};

	return handleRequest({ req, res, handle });
}

exports.handler = deleteDatabase;
