const { handleRequest } = require('../helpers');
const KubernetesClusterService = require('../../db/models/kubernetes/kubernetesCluster.service');

async function getActiveDatabaseDetails(req, res, next) {
	const validationSchema = null;

	const handle = async () => {
		const clusterName = req.params.clusterName;
		const environmentId = res.locals.environmentId;
		const version = req.query.version;
		return await KubernetesClusterService.getDetails(environmentId, clusterName, version);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = getActiveDatabaseDetails;
