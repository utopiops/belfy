const AuditService = require('../../db/models/audit/audit.service');
const { handleRequest } = require('../helpers');

async function getloginHistories(req, res) {
	const handle = async () => {
		const accountId = res.locals.accountId;
		return await AuditService.getloginHistories(accountId);
	};

	const extractOutput = async (outputs) => outputs;
	await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getloginHistories;
