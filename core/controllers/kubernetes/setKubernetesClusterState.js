const { handleRequest } = require('../helpers');
const KubernetesClusterService = require('../../db/models/kubernetes/kubernetesCluster.service');
const yup = require('yup');

async function setKubernetesClusterState(req, res) {
	const validationSchema = yup.object().shape({
		code: yup.string().oneOf([ 'deployed', 'deploy_failed', 'destroyed', 'destroy_failed' ]).required(),
		job: yup.string().required()
	});
	const handle = async () => {
		const clusterName = req.params.clusterName;
		const environmentId = res.locals.environmentId;
		const state = req.body;

		return await KubernetesClusterService.setState(environmentId, clusterName, state);
	};
	return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = setKubernetesClusterState;
