const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');

async function getApplicationResources(req, res) {
	const handle = async () => {
    const { provider, environmentName, environmentId, credentials, domain } = res.locals;
    const { applicationName } = req.params
    const { bucketName, region } = provider.backend;
    const fields = req.query.fields //Sending response based on fields query

    switch (provider.backend.name) {
      case 'aws':
        return await ApplicationService.getApplicationResources(environmentId, environmentName, applicationName, credentials, region, bucketName, domain, fields);
      case 'azure':
        return await ApplicationService.getAzureApplicationResources(applicationName, credentials, environmentName, fields, provider.backend);
		  default:
        return {
          error: {
            message: 'Invalid provider',
            statusCode: 400
          }
        }
    }
  };

  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getApplicationResources;
