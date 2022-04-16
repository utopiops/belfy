const { handleRequest } = require('../helpers');
const DatabaseService = require('../../db/models/database/database.service');
const yup = require('yup');

async function setDatabaseState(req, res) {
	const validationSchema = yup.object().shape({
		code: yup.string().oneOf([ 'deployed', 'deploy_failed', 'destroyed', 'destroy_failed' ]).required(),
		job: yup.string().required()
	});
	const handle = async () => {
		const databaseName = req.params.databaseName;
		const environmentId = res.locals.environmentId;
		const state = req.body;

		return await DatabaseService.setState(environmentId, databaseName, state);
	};
	return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = setDatabaseState;
