const { handleRequest } = require('../helpers');
const KubernetesClusterService = require('../../db/models/kubernetes/kubernetesCluster.service');
const yup = require('yup');

async function dryRunKubernetesCluster(req, res) {
	const validationSchema = yup.object().shape({
		version: yup.number(),
		variables: yup.object()
	});

	const handle = async () => {
    const { accountId, userId, environmentId, credentials, provider, headers } = res.locals;
    const { environmentName, clusterName } = req.params;
    const { variables, version } = req.body;
    const providerDetails = provider.backend
  
		return await KubernetesClusterService.tfActionKubernetes('dryRun', accountId, userId, environmentId, environmentName, clusterName, credentials, providerDetails, variables, headers, version);
	};

	const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = dryRunKubernetesCluster;
