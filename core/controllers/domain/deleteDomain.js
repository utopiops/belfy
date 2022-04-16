const { handleRequest } = require('../helpers');
const domainService = require('../../db/models/domain/domain.service');
const yup = require('yup');

async function deleteDomain(req, res, next) {

  const handle = async () => {
    const { accountId } = res.locals;
    const { domainName } = req.params;

    return await domainService.deleteDomain(domainName, accountId);
  };

  return handleRequest({ req, res, handle });
}

exports.handler = deleteDomain;
