const { handleRequest } = require('../helpers');
const domainService = require('../../db/models/domain/domain.service');
const constants = require('../../utils/constants');

async function getDomainResources(req, res) {

  const handle = async () => {
    const { accountId } = res.locals;
    const { domainName } = req.params
    const fields = req.query.fields //Sending response based on fields query
    
		return await domainService.getDomainResources(accountId, domainName, fields);
	};

  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getDomainResources;
