const express = require('express');
const router = express.Router();
const { getProviderWithCredentialsV3 } = require('../../middlewares/getProviderV3');
const { access } = require('../../middlewares/planManager');

const { handler: listKubernetesClusters } = require('./listKubernetesClusters')
const { handler: listAccountKubernetesClusters } = require('./listAccountKubernetesClusters');
const { handler: listKubernetesClusterVersions } = require('./listKubernetesClusterVersions');
const { handler: getKubernetesClusterDetails } = require('./getKubernetesClusterDetails');
const { handler: getKubernetesClusterResources } = require('./getKubernetesClusterResources');
const { handler: getKubernetesClusterKind } = require('./getKubernetesClusterKind');
const { handler: createOrUpdateEKS } = require('./createOrUpdateEKS');
const { handler: activateKubernetesCluster } = require('./activateKubernetesCluster');
const { handler: getActiveKubernetesClusterDetails } = require('./getActiveKubernetesClusterDetails');
const { handler: dryRunKubernetesCluster } = require('./dryRunKubernetesCluster');
const { handler: deployKubernetesCluster } = require('./deployKubernetesCluster');
const { handler: destroyKubernetesCluster } = require('./destroyKubernetesCluster');
const { handler: setKubernetesClusterState } = require('./setKubernetesClusterState');
const { handler: deleteKubernetesCluster } = require('./deleteKubernetesCluster');

router.get(
	'/type/environment/name/:environmentName',
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	listKubernetesClusters
);

router.get('/type/environment', listAccountKubernetesClusters);

router.get(
	'/environment/name/:environmentName/cluster/name/:clusterName/versions',
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	listKubernetesClusterVersions
);

router.get(
	'/environment/name/:environmentName/cluster/name/:clusterName/version/:version',
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	getKubernetesClusterDetails
);

// Note: none of these two are used at the moment, remove this comment when they are. As part of a solution I added them and now I just wanna keep them to avoid wasting the effort?!
router.get(
	'/environment/name/:environmentName/cluster/name/:clusterName/resources',
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	getKubernetesClusterResources
);

router.get(
	'/environment/name/:environmentName/cluster/name/:clusterName/kind',
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	getKubernetesClusterKind
);

router.post(
	[
		'/environment/name/:environmentName/cluster/eks', // Create a new EKS
		'/environment/name/:environmentName/cluster/eks/version/:version' // Add a new revision to EKS
	],
  access({ resource: 'kubernetes_cluster', action: 'create' }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	createOrUpdateEKS
);

// Update a version of an existing EKS which hasn't been activated
router.put(
	'/environment/name/:environmentName/cluster/eks/version/:version',
  access({ resource: 'kubernetes_cluster', action: 'create' }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	createOrUpdateEKS
);

// Activate a version of kubernetes cluster
router.post(
	'/environment/name/:environmentName/cluster/name/:clusterName/activate',
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	activateKubernetesCluster
);

// Get active kubernetes cluster details
// Note: For now this route returns active or inactive versions
router.get(
	'/environment/name/:environmentName/cluster/name/:clusterName/tf',
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	getActiveKubernetesClusterDetails
);

// // Dry-run a version of kubernetes cluster
router.post(
	'/environment/name/:environmentName/cluster/name/:clusterName/dry-run',
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	dryRunKubernetesCluster
);

// Deploy a version of kubernetes cluster
router.post(
	'/environment/name/:environmentName/cluster/name/:clusterName/deploy',
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	deployKubernetesCluster
);

// Destroy a version of kubernetes cluster
router.post(
	'/environment/name/:environmentName/cluster/name/:clusterName/destroy',
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	destroyKubernetesCluster
);

// Set kubernetes cluster state
router.post(
	'/environment/name/:environmentName/cluster/name/:clusterName/state',
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	setKubernetesClusterState
);

// Delete the kubernetes cluster
router.delete(
	'/environment/name/:environmentName/cluster/name/:clusterName',
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	deleteKubernetesCluster
);

module.exports = router;
