const { handleRequest } = require('../helpers');
const domainService = require('../../db/models/domain/domain.service');
const constants = require('../../utils/constants');

async function destroyDomain(req, res) {

  const handle = async () => {
    const { userId, accountId } = res.locals;
    const { domainName } = req.params;
    const jobPath = constants.jobPaths.destroyDomain;

    return await domainService.tfActionDomain('destroy', userId, accountId, jobPath, domainName);
  };

  const extractOutput = async (outputs) => outputs;

  return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = destroyDomain;
