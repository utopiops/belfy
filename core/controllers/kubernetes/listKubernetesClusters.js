const { handleRequest } = require('../helpers');
const KubernetesClusterService = require('../../db/models/kubernetes/kubernetesCluster.service');

async function listKubernetesClusters(req, res) {
	const validationSchema = null;

	const handle = async () => {
		const environmentId = res.locals.environmentId;
		return await KubernetesClusterService.listKubernetesClusters(environmentId);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = listKubernetesClusters;
