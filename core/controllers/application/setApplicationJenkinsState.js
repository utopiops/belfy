const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');
const yup = require('yup');

async function setApplicationJenkinsState(req, res) {
	const validationSchema = yup.object().shape({
		code: yup.string().oneOf(['installing', 'building', 'deploying', 'deployed', 'deploy_failed', 'install_failed', 'build_failed']).required(),
		kind: yup.string().required()
	});
	const handle = async () => {
		const { accountId, kind, code } = req.body;
    const jenkinsState = { code };
    const { environmentName, applicationName } = req.params;
    const { environmentId } = res.locals;
		return await ApplicationService.setApplicationJenkinsState(accountId, environmentId, environmentName, applicationName, jenkinsState, kind);
	};

	return handleRequest({ req, res, handle, validationSchema });
}

exports.handler = setApplicationJenkinsState;
