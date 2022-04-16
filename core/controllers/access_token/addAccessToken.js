const AccessTokenService = require('../../db/models/access_token/accessToken.service');
const { handleRequest } = require('../helpers');

async function addAccessToken(req, res) {
	const handle = async () => {
		const { accountId, userId } = res.locals;
		return await AccessTokenService.addAccessToken(accountId, userId);
	};
  
	const extractOutput = async (outputs) => outputs;

	await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = addAccessToken;
