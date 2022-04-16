const { handleRequest } = require('../helpers');
const KubernetesClusterService = require('../../db/models/kubernetes/kubernetesCluster.service');

async function getKubernetesClusterKind(req, res) {
	const validationSchema = null;

	const handle = async () => {
		const environmentId = res.locals.environmentId;
		const clusterName = req.params.clusterName;
		return await KubernetesClusterService.getKind(environmentId, clusterName);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = getKubernetesClusterKind;
