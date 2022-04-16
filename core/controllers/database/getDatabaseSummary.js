const { handleRequest } = require('../helpers');
const DatabaseService = require('../../db/models/database/database.service');

async function getDatabaseSummary(req, res) {
	const handle = async () => {
    const { environmentId } = res.locals;
    const { databaseName } = req.params

		return await DatabaseService.getDatabaseSummary(environmentId, databaseName);
	};

  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getDatabaseSummary;
