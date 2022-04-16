const { handleRequest } = require('../helpers');
const domainService = require('../../db/models/domain/domain.service');
const yup = require('yup');

async function setDomainState(req, res) {
  const validationSchema = yup.object().shape({
    code: yup
      .string()
      .oneOf(['deployed', 'deploy_failed', 'destroyed', 'destroy_failed'])
      .required(),
    job: yup.string().required(),
  });
  const handle = async () => {
    const { accountId, domainName } = req.params;
    const { code, job } = req.body;
    const state = { code, job }

    return await domainService.setState(accountId, domainName, state);
  };
  return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = setDomainState;
