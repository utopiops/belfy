const EnvironmentService = require('../../db/models/environment/environment.service');
const { handleRequest } = require('../helpers');
const yup = require('yup');

async function setEnvironmentState(req, res) {

	const validationSchema = yup.object().shape({
		statusCode: yup.string().required().oneOf([ 'deployed', 'destroyed', 'deploy_failed', 'destroy_failed' ]) ,
    jobId: yup.string()
	});

	const handle = async () => {
    const { accountId, environmentName } = res.locals;
    const { statusCode , jobId } = req.body;
    
		return await EnvironmentService.setEnvironmentState(accountId, environmentName, statusCode , jobId);
	};

	return await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = setEnvironmentState;
