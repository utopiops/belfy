const { handleRequest } = require('../helpers');
const functionService = require('../../db/models/utopiops_application/function.service');
const yup = require('yup');
const constants = require('../../utils/constants');

async function updateFunctionApplicationHistory(req, res) {
	const handle = async () => {
    const accountId = req.body.accountId;
    const applicationName = req.params.applicationName;

    delete req.body.createdAt;

    const newCommit = req.body;

    return await functionService.updateFunctionApplicationHistory(accountId, applicationName, newCommit);
	};

	return handleRequest({ req, res, handle });
}

exports.handler = updateFunctionApplicationHistory;
