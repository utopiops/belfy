const { handleRequest } = require('../helpers');
const KubernetesClusterService = require('../../db/models/kubernetes/kubernetesCluster.service');

async function listKubernetesClusterVersions(req, res) {
	const validationSchema = null;
	const handle = async () => {
		const clusterName = req.params.clusterName;
		const environmentId = res.locals.environmentId;
		return await KubernetesClusterService.listKubernetesClusterVersions(environmentId, clusterName);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = listKubernetesClusterVersions;
