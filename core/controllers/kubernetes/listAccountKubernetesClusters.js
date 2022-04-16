const { handleRequest } = require('../helpers');
const KubernetesClusterService = require('../../db/models/kubernetes/kubernetesCluster.service');

async function listAccountKubernetesClusters(req, res) {
	const validationSchema = null;

	const handle = async () => {
		const accountId = res.locals.accountId;
		return await KubernetesClusterService.listAccountKubernetesClusters(accountId);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = listAccountKubernetesClusters;
