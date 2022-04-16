const { handleRequest } = require('../helpers');
const DatabaseService = require('../../db/models/database/database.service');

async function listAccountDatabases(req, res) {
	const validationSchema = null;

	const handle = async () => {
		const accountId = res.locals.accountId;
		return await DatabaseService.listAccountDatabases(accountId);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = listAccountDatabases;
