const { handleRequest } = require('../helpers');
const KubernetesClusterService = require('../../db/models/kubernetes/kubernetesCluster.service');

async function getKubernetesClusterDetails(req, res) {
	const validationSchema = null;
	const handle = async () => {
		const clusterName = req.params.clusterName;
		const version = req.params.version;
		const environmentId = res.locals.environmentId;
		return await KubernetesClusterService.getKubernetesClusterDetails(environmentId, clusterName, version);
	};
	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = getKubernetesClusterDetails;
