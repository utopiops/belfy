const { handleRequest } = require('../helpers');
const UtopiopsApplicationService = require('../../db/models/utopiops_application/utopiopsApplication.service');
const yup = require('yup');

async function setApplicationJenkinsState(req, res) {
	const validationSchema = yup.object().shape({
		code: yup.string().oneOf(['installing', 'building', 'deploying', 'deployed', 'deploy_failed', 'install_failed', 'build_failed', 'destroyed', 'destroy_failed']).required(),
		kind: yup.string().required()
	});

	const handle = async () => {
	const { accountId, kind, code } = req.body;
    const jenkinsState = { code };
    const { applicationName } = req.params;
		return await UtopiopsApplicationService.setApplicationJenkinsState(accountId, applicationName, jenkinsState, kind);
	};

	return handleRequest({ req, res, handle, validationSchema });
}

exports.handler = setApplicationJenkinsState;
