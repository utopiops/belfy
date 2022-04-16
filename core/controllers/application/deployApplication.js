const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');
const yup = require('yup');

async function deployApplication(req, res) {
  const validationSchema = yup.object().shape({
    version: yup.number(),
    variables: yup.object(),
    externalDeployer: yup.string(),
    commitId: yup.string(),
    pipelineId: yup.string(),
    pipelineJobId: yup.string(),
    pipelineLink: yup.string(),
  });

	const handle = async () => {
    const { accountId, userId, environmentId, environmentName, credentials, domain, headers } = res.locals;
    const { gitsha } = req.body;
    const providerDetails = res.locals.provider.backend;
    const { applicationName } = req.params;
    const { username } = req.user;

		return await ApplicationService.tfActionApplication('deploy', accountId, userId, username, environmentId, environmentName, applicationName, req.body, credentials, providerDetails, domain, headers, gitsha);
	};

	const extractOutput = async (outputs) => outputs

	return handleRequest({ req, res, validationSchema, handle, extractOutput })
}

exports.handler = deployApplication;
