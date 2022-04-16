const AuditService = require('../../db/models/audit/audit.service');
const { handleRequest } = require('../helpers');

async function getUserLoginHistory(req, res) {
	const handle = async () => {
		const username = req.params.username;
		const accountId = res.locals.accountId;
		return await AuditService.getUserLoginHistory(accountId, username);
	};

	const extractOutput = async (outputs) => outputs;
	await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getUserLoginHistory;
