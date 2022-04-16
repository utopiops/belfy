const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');
const yup = require('yup');

async function activateApplication(req, res, next) {
  const validationSchema = yup.object().shape({
    version: yup.number()
      .required()
  });

	const handle = async () => {
    const { userId, environmentId } = res.locals;
    const { applicationName } = req.params;
    const version = req.body.version;
		return await ApplicationService.activateApplication(userId, environmentId, applicationName, Number(version));;
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = activateApplication;
