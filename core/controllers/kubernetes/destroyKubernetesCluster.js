const { handleRequest } = require('../helpers');
const KubernetesClusterService = require('../../db/models/kubernetes/kubernetesCluster.service');
const yup = require('yup');

async function destroyKubernetesCluster(req, res) {
	const validationSchema = yup.object().shape({
		variables: yup.object()
	});

	const handle = async () => {
    const { accountId, userId, environmentId, credentials, provider, headers } = res.locals;
    const { environmentName, clusterName } = req.params;
    const { variables } = req.body;
    const providerDetails = provider.backend
  
		return await KubernetesClusterService.tfActionKubernetes('destroy', accountId, userId, environmentId, environmentName, clusterName, credentials, providerDetails, variables, headers);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = destroyKubernetesCluster;
