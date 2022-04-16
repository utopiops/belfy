const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');
const yup = require('yup');

async function dryRunApplication(req, res) {
  const validationSchema = yup.object().shape({
    accessKeyId: yup.string(),
    secretAccessKey: yup.string(),
    version: yup.number(),
    variables: yup.object(),
    externalDeployer: yup.string(),
    commitId: yup.string(),
    pipelineId: yup.string(),
    pipelineJobId: yup.string(),
  });

	const handle = async () => {
    const { accountId, userId, environmentId, environmentName, credentials, domain, headers } = res.locals;
    const providerDetails = res.locals.provider.backend
    const { applicationName } = req.params;
    const { username } = req.user;

    return await ApplicationService.tfActionApplication('dryRun', accountId, userId, username, environmentId, environmentName, applicationName, req.body, credentials, providerDetails, domain, headers);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = dryRunApplication;
