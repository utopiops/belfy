const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');
const yup = require('yup');

async function setDynamicApplicationJenkinsState(req, res) {
	const validationSchema = yup.object().shape({
		code: yup.string().oneOf(['installing', 'building', 'deploying', 'deployed', 'deploy_failed', 'install_failed', 'build_failed']).required(),
		kind: yup.string().required()
	});
	const handle = async () => {
		const { accountId, kind, code } = req.body;
    const jenkinsState = { code };
    const { environmentName, applicationName, dynamicName } = req.params;
    const { environmentId } = res.locals;
		return await ApplicationService.setDynamicApplicationJenkinsState(accountId, environmentId, environmentName, applicationName, dynamicName, jenkinsState, kind);
	};

	return handleRequest({ req, res, handle, validationSchema });
}

exports.handler = setDynamicApplicationJenkinsState;
