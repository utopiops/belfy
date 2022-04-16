const { handleRequest } = require('../helpers');
const UtopiopsApplicationService = require('../../db/models/utopiops_application/utopiopsApplication.service');
const yup = require('yup');

async function saveBuildTime(req, res) {
  const validationSchema = yup.object().shape({
		accountId: yup.string().required(),
		buildTime: yup.string().required()
	});

  const handle = async () => {
    const { applicationName } = req.params;
		const { accountId, buildTime } = req.body;
    
    return await UtopiopsApplicationService.saveBuildTime(accountId, applicationName, buildTime);
  };

	return handleRequest({ req, res, handle, validationSchema });
}

exports.handler = saveBuildTime;

