const { handleRequest } = require('../helpers');
const domainService = require('../../db/models/domain/domain.service');
const yup = require('yup');

async function addDomain(req, res, next) {
  const validationSchema = yup.object().shape({
    domainName: yup.string().lowercase().strict().matches(/(\S+\.\S+)/).required(),
  });

  const handle = async () => {
    const { userId, accountId } = res.locals;
    const { domainName } = req.body;

    return await domainService.addDomain(domainName, accountId, userId);
  };

  return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = addDomain;
