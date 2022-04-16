const { handleRequest } = require('../helpers');
const domainService = require('../../db/models/domain/domain.service');
const yup = require('yup');

async function listDomains(req, res, next) {
  const handle = async () => {
    const { accountId } = res.locals;

    return await domainService.listDomains(accountId);
  };

  const extractOutput = async (outputs) => outputs;
  return handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listDomains;
