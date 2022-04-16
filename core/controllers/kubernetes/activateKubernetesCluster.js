const { handleRequest } = require('../helpers');
const KubernetesClusterService = require('../../db/models/kubernetes/kubernetesCluster.service');
const yup = require('yup');

async function activateKubernetesCluster(req, res, next) {
	const validationSchema = yup.object().shape({
		version: yup.number().required()
	});

	const handle = async () => {
		const { userId, environmentId } = res.locals;
		const { clusterName } = req.params;
		const { version } = req.body;
		return await KubernetesClusterService.activate(userId, environmentId, clusterName, Number(version));
	};

	return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = activateKubernetesCluster;
