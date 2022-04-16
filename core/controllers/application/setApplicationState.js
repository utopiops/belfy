const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');
const yup = require('yup');

async function dryRunApplication(req, res) {
  const validationSchema = yup.object().shape({
    code: yup.string().oneOf(['deployed', 'deploy_failed', 'destroyed', 'destroy_failed']).required(),
    job: yup.string().required(),
    dynamicName: yup.string()
  });

	const handle = async () => {
    const { environmentId, accountId } = res.locals;
    const { applicationName } = req.params;
    const { code, job, dynamicName } = req.body;
    const state = { code, job };
		return await ApplicationService.setState(accountId, environmentId, applicationName, state, dynamicName);
	};

	return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = dryRunApplication;
