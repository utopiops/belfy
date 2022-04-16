const { handleRequest } = require('../helpers');
const ApplicationService = require('../../db/models/application/application.service');
const yup = require('yup');

async function saveBuildTime(req, res) {
  const validationSchema = yup.object().shape({
    buildTime: yup.string().required()
  });

	const handle = async () => {
		const { accountId, environmentId } = res.locals;
		const { applicationName } = req.params;
		const { buildTime } = req.body;

		return await ApplicationService.saveBuildTime(accountId, environmentId, applicationName, buildTime);
	};

	return handleRequest({ req, res, handle, validationSchema });
}

exports.handler = saveBuildTime;
