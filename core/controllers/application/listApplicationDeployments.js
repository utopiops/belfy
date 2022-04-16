const { handleRequest } = require('../helpers');
const ApplicationDeploymentService = require('../../db/models/application/applicationDeployment.service');
const yup = require('yup');

async function listApplicationDeployments(req, res) {
    const validationSchema = yup.object().shape({
        applicationName: yup.string(),
        environmentName: yup.string().when('applicationName', {
          is: undefined,
          otherwise: yup.string().required()
        })
    });

	const handle = async () => {
        const { accountId } = res.locals;
        const { environmentName, applicationName } = req.query;
		return await ApplicationDeploymentService.list(accountId, environmentName, applicationName);;
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = listApplicationDeployments;
