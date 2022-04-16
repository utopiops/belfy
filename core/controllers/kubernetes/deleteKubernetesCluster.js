const { handleRequest } = require('../helpers');
const KubernetesClusterService = require('../../db/models/kubernetes/kubernetesCluster.service');

async function deleteKubernetesCluster(req, res) {
	const handle = async () => {
		const clusterName = req.params.clusterName;
		const userId = res.locals.userId;
		const environmentId = res.locals.environmentId;
		return await KubernetesClusterService.deleteKubernetesCluster(userId, environmentId, clusterName);
	};

	return handleRequest({ req, res, handle });
}

exports.handler = deleteKubernetesCluster;
