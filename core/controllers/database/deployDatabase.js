const { tfActionDatabase } = require('../../db/models/database/database.service');
const { handleRequest } = require('../helpers');
const yup = require('yup');

async function deployDatabase(req, res) {
	const validationSchema = yup.object().shape({
		accessKeyId: yup.string(),
		secretAccessKey: yup.string(),
		version: yup.number(),
		variables: yup.object()
	});

	const handle = async () => {
		return await tfActionDatabase('deploy', req, res);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = deployDatabase;
