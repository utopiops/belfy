const { handleRequest } = require('../helpers');
const DatabaseService = require('../../db/models/database/database.service');
const yup = require('yup');

async function activateDatabase(req, res, next) {
	const validationSchema = yup.object().shape({
		version: yup.number().required()
	});

	const handle = async () => {
		const databaseName = req.params.databaseName;
		const userId = res.locals.userId;
		const environmentId = res.locals.environmentId;
		const version = req.body.version;
		return await DatabaseService.activate(userId, environmentId, databaseName, Number(version));
	};

	return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = activateDatabase;
