const { handleRequest } = require('../helpers');
const DatabaseService = require('../../db/models/database/database.service');

// This method pulls the state file from s3 for the application and based on fields query extracts the root module outputs or entire state as the application resources.
// If the state file is not found for any reason it responds with BAD_REQUEST
async function getDatabaseResources(req, res) {
	const handle = async () => {
		const databaseName = req.params.databaseName;
		const environmentName = req.params.environmentName;
		const credentials = res.locals.credentials;
		const { bucketName, region } = res.locals.provider.backend;
    const fields = req.query.fields; 

    return await DatabaseService.getDatabaseResources(environmentName, databaseName, credentials, region, bucketName, fields)

	};
  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}


exports.handler = getDatabaseResources;
