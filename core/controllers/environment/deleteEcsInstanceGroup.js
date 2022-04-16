const AWSEnvironmentService = require('../../db/models/environment/awsEnvironment.service');
const { handleRequest } = require('../helpers');
const constants = require('../../utils/constants');

async function deleteEcsInstanceGroup(req, res) {
  const validationSchema = null;

	const handle = async () => {
    const { accountId, environmentName } = res.locals;
    const { clusterName, igName, version } = req.params;
    const isAdd = req.query.mode == 'edit' ? false : true;

		return await AWSEnvironmentService.deleteEcsInstanceGroup(
			accountId,
			environmentName,
			version,
			isAdd,
			clusterName,
			igName
		);
	};

	return await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = deleteEcsInstanceGroup;
