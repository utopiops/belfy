const { handleRequest } = require('../helpers');
const UtopiopsApplicationService = require('../../db/models/utopiops_application/utopiopsApplication.service');
const yup = require('yup');

async function setState(req, res) {
  const validationSchema = yup.object().shape({
    code: yup.string().oneOf(['deployed', 'deploy_failed', 'destroyed', 'destroy_failed']).required(),
    job: yup.string().required(),
    dynamicName: yup.string()
  });

	const handle = async () => {
    const { accountId, applicationName } = req.params;
    const { code, job, dynamicName } = req.body;
    const state = { code, job };
		return await UtopiopsApplicationService.setState(accountId, applicationName, state, dynamicName);
	};

	return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = setState;
