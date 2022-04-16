const AccessTokenService = require('../../db/models/access_token/accessToken.service');
const { handleRequest } = require('../helpers');

async function getAccountAccessTokens(req, res) {
	const handle = async () => {
		const { accountId } = res.locals;
		return await AccessTokenService.getAccountAccessTokens(accountId);
	};

	const extractOutput = async (outputs) => outputs;

	await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getAccountAccessTokens;
