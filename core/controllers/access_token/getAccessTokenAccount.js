const AccessTokenService = require('../../db/models/access_token/accessToken.service');
const { handleRequest } = require('../helpers');

async function getAccessTokenAccount(req, res) {
	const handle = async () => {
    const { token } = req.params;
		return await AccessTokenService.getAccessTokenAccount(token);
	};

	const extractOutput = async (outputs) => outputs;

	await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getAccessTokenAccount;
