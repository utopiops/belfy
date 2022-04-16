const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');
const yup = require('yup');

async function createPipeline(req, res) {
  const validationSchema = yup.object().shape({
    gitService: yup.string().required()
  });

	const handle = async () => {
    const { environmentId, headers } = res.locals;
    const { region, cloudProviderAccountId } = res.locals.provider.backend;
    const { applicationName, environmentName, version } = req.params;
    const { gitService } = req.body;
		return await ApplicationService.createPipeline(environmentId, environmentName, applicationName, version, headers, region, cloudProviderAccountId, gitService);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = createPipeline;
