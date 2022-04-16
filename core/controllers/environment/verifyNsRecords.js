const { handleRequest } = require('../helpers');
const yup = require('yup');
const EnvironmentService = require('../../db/models/environment/environment.service');

async function verifyNsRecords(req, res) {

	const handle = async () => {
		const { accountId, environmentName, credentials } = res.locals;
    const { region, bucketName } = res.locals.provider.backend
    
		return await EnvironmentService.verifyNsRecords(accountId, environmentName, credentials, region, bucketName);
	};

  const extractOutput = async (outputs) => outputs

	await handleRequest({ req, res, handle, extractOutput });
}

exports.handler = verifyNsRecords;
