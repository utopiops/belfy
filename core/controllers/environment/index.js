const express = require('express');
const router = express.Router();
const { getProviderWithCredentialsV2 } = require('../../middlewares/getProviderV2');
const { authorize } = require('../../middlewares/accessManager');
const { access } = require('../../middlewares/planManager');


const { handler: listEnvironmentDeployments } = require('./listEnvironmentDeployments');
const { handler: listEnvironmentDeploymentsByDate } = require('./listEnvironmentDeploymentsByDate');
const { handler: getEnvironmentDeploymentsSummary } = require('./getEnvironmentDeploymentsSummary');
const { handler: getEnvironmentLatestDeployment } = require('./getEnvironmentLatestDeployment');
const { handler: createEnvironment } = require('./createEnvironment');
const { handler: listEnvironments } = require('./listEnvironments');
const { handler: getEnvironmentProviderCredentials } = require('./getEnvironmentProviderCredentials');
const { handler: getProvidersWithSameBackend } = require('./getProvidersWithSameBackend');
const { handler: addAlb } = require('./addAlb');
const { handler: addNlb } = require('./addNlb');
const { handler: addListenerToAlb } = require('./addListenerToAlb');
const { handler: deleteAlbListener } = require('./deleteAlbListener');
const { handler: listAlbs } = require('./listAlbs');
const { handler: deleteEcsInstanceGroup } = require('./deleteEcsInstanceGroup');
const { handler: addECSCluster } = require('./addECSCluster');
const { handler: updateEcsInstanceGroup } = require('./updateEcsInstanceGroup');
const { handler: listEcsClusters } = require('./listEcsClusters');
const { handler: getEnvironmentDetails } = require('./getEnvironmentDetails');
const { handler: getEnvironmentDetailsVersion } = require('./getEnvironmentDetailsVersion');
const { handler: dryRunEnvironment } = require('./dryRunEnvironment');
const { handler: activateEnvironment } = require('./activateEnvironment');
const { handler: deployEnvironment } = require('./deployEnvironment');
const { handler: destroyEnvironment } = require('./destroyEnvironment');
const { handler: deleteEnvironment } = require('./deleteEnvironment');
const { handler: setEnvironmentState } = require('./setEnvironmentState');
const { handler: deleteAlb } = require('./deleteAlb');
const { handler: deleteNlb } = require('./deleteNlb');
const { handler: updateAlbListenerCertificate } = require('./updateAlbListenerCertificate');
const { handler: addEcsInstanceGroup } = require('./addEcsInstanceGroup');
const { handler: updateEcsClusterDependencies } = require('./updateEcsClusterDependencies');
const { handler: getEnvironmentResources } = require('./getEnvironmentResources');
const { handler: setAlbWaf } = require('./setAlbWaf');
const { handler: deleteEcsCluster } = require('./deleteEcsCluster');
const { handler: addOrUpdateSchedule } = require('./addOrUpdateSchedule');
const { handler: deleteSchedule } = require('./deleteSchedule');
const { handler: getSchedule } = require('./getSchedule');
const { handler: verifyNsRecords } = require('./verifyNsRecords');

const azure_environment = require('./azure');
router.use('/azure', azure_environment)

const gcp_environment = require('./gcp');
router.use('/gcp', gcp_environment)

// Create environment
/**
 * @swagger
 * /v3/environment:
 *   post:
 *     description: Create environment
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  '/',
  access({ resource: 'environment', action: 'create' }),
  authorize({ resource: 'aws_environment', action: 'create' }),
  createEnvironment
);

// List environment deployments
router.get(
  "/deployment",
  listEnvironmentDeployments
);

// List environment deployments by date
router.get(
  "/deployment/by_date",
  listEnvironmentDeploymentsByDate
);

// Get environment deployments summary
router.get(
  "/deployment/environment/name/:environmentName/summary",
  getEnvironmentDeploymentsSummary
);

// Get environment's latest deployment
router.get(
  "/deployment/environment/name/:environmentName/latest",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  getEnvironmentLatestDeployment
);

// List environments
router.get(
  '/',
  authorize({ resource: 'aws_environment', action: 'get' }),
  listEnvironments
);

// Get the credentials of the environment's provider
router.get(
	'/name/:name/provider/credentials',
	authorize({ resource: 'aws_environment', action: 'get', params: [{type: 'route', key: 'name'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	getEnvironmentProviderCredentials
);

// Get list of providers with the same backend as the environment's provider
router.get(
	'/name/:name/provider/same_backend',
	authorize({ resource: 'aws_environment', action: 'get', params: [{type: 'route', key: 'name'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	getProvidersWithSameBackend
);

// Add ALB to the environment (create new version)
router.post('/name/:name/version/:version/alb', authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }), getProviderWithCredentialsV2({ routeParam: 'name' }), addAlb);

// Add ALB to the environment (update existing version)
router.put('/name/:name/version/:version/alb', authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }), getProviderWithCredentialsV2({ routeParam: 'name' }), addAlb);

// Set ALB waf of the environment (create new version)
router.post('/name/:name/version/:version/alb_waf', authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }), getProviderWithCredentialsV2({ routeParam: 'name' }), setAlbWaf);

// Set ALB waf of the environment (update existing version)
router.put('/name/:name/version/:version/alb_waf', authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }), getProviderWithCredentialsV2({ routeParam: 'name' }), setAlbWaf);

// Delete an ALB
router.delete(
	'/name/:name/version/:version/alb/:albName',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'albName'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	deleteAlb
);

// Add NLB to the environment (create new version)
router.post('/name/:name/version/:version/nlb', authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }), getProviderWithCredentialsV2({ routeParam: 'name' }), addNlb);

// Add NLB to the environment (update existing version)
router.put('/name/:name/version/:version/nlb', authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }), getProviderWithCredentialsV2({ routeParam: 'name' }), addNlb);

// Delete an NLB
router.delete(
	'/name/:name/version/:version/nlb/:nlbName',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'nlbName'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	deleteNlb
);

// Add listener to the environment ALB (create new version)
router.post(
	'/name/:name/version/:version/alb/:albName/listener',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'albName'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	addListenerToAlb
);

// Add listener to the environment ALB (update existing version)
router.patch(
	'/name/:name/version/:version/alb/:albName/listener',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'albName'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	addListenerToAlb
);

// Delete listener from the environment ALB
router.delete(
	'/name/:name/version/:version/alb/:albName/listener/port/:port',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'albName'}, {type: 'route', key: 'port'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	deleteAlbListener
);

// Update the environment ALB's listener's certificate (create new version)
router.post(
	'/name/:name/version/:version/alb/:albName/listener/port/:port',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'albName'}, {type: 'route', key: 'port'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	updateAlbListenerCertificate
);

// Update the environment ALB's listener's certificate (update existing version)
router.put(
	'/name/:name/version/:version/alb/:albName/listener/port/:port',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'albName'}, {type: 'route', key: 'port'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	updateAlbListenerCertificate
);

// Get the list of names of all the ALBs of the environment {:name}
router.get('/name/:name/version/:version/alb/name', authorize({ resource: 'aws_environment', action: 'get', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }), getProviderWithCredentialsV2({ routeParam: 'name' }), listAlbs);

// Add ECS cluster to the environment
router.post(
	'/name/:name/version/:version/ecs_cluster',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	addECSCluster
);

router.put(
	'/name/:name/version/:version/ecs_cluster',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	addECSCluster
);

// Add instance group to ECS cluster (create new version)
router.post(
	'/name/:name/version/:version/ecs_cluster/name/:clusterName/instance_group',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'clusterName'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	addEcsInstanceGroup
);

// Add instance group to ECS cluster (update existing version)
router.put(
	'/name/:name/version/:version/ecs_cluster/name/:clusterName/instance_group',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'clusterName'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	addEcsInstanceGroup
);

// Update instance group of ECS cluster (create new version)
router.post(
	'/name/:name/version/:version/ecs_cluster/name/:clusterName/instance_group/:instanceGroupName',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'clusterName'}, {type: 'route', key: 'instanceGroupName'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	updateEcsInstanceGroup
);

// Update instance group of ECS cluster (update existing version)
router.put(
	'/name/:name/version/:version/ecs_cluster/name/:clusterName/instance_group/:instanceGroupName',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'clusterName'}, {type: 'route', key: 'instanceGroupName'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	updateEcsInstanceGroup
);

// Delete instance group to ECS cluster
router.delete(
	'/name/:name/version/:version/ecs_cluster/name/:clusterName/instance_group/name/:igName',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'clusterName'}, {type: 'route', key: 'igName'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	deleteEcsInstanceGroup
);

// Delete ECS cluster
router.delete(
	'/name/:name/version/:version/ecs_cluster/name/:clusterName',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'clusterName'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	deleteEcsCluster
);

// Update ECS cluster's dependencies (create new version)
router.post(
	'/name/:name/version/:version/ecs_cluster/name/:clusterName/dependencies',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'clusterName'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	updateEcsClusterDependencies
);

// Update ECS cluster's dependencies (update existing version)
router.put(
	'/name/:name/version/:version/ecs_cluster/name/:clusterName/dependencies',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}, {type: 'route', key: 'clusterName'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	updateEcsClusterDependencies
);

// Add or update schedule time to the environment (create new version)
router.post(
	'/name/:name/version/:version/schedule',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	addOrUpdateSchedule
);

// Add or update schedule time to the environment (update existing version)
router.put(
	'/name/:name/version/:version/schedule',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	addOrUpdateSchedule
);

// delete schedule time of the environment
router.delete(
	'/name/:name/version/:version/schedule',
	authorize({ resource: 'aws_environment', action: 'update', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	deleteSchedule
);

// get schedule time of the environment
router.get(
	'/name/:name/version/:version/schedule',
	authorize({ resource: 'aws_environment', action: 'get', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	getSchedule
);

// Get the names of all of the ECS clusters of the environment {:name}
router.get(
	'/name/:name/version/:version/ecs_cluster/name',
	authorize({ resource: 'aws_environment', action: 'get', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	listEcsClusters
);

// Get the environment details {:name}
router.get('/name/:name',
	authorize({ resource: 'aws_environment', action: 'get', params: [{type: 'route', key: 'name'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	getEnvironmentDetails
);

// Get the environment details with version {:name}
router.get('/name/:name/version',
	authorize({ resource: 'aws_environment', action: 'get', params: [{type: 'route', key: 'name'}, {type: 'query', key: 'version'}, {type: 'query', key: 'action'} ] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	getEnvironmentDetailsVersion
);

// Destroy environment
router.post('/name/:name/destroy',
	authorize({ resource: 'aws_environment_deployment', action: 'destroy', params: [{type: 'route', key: 'name'}] }),
 	getProviderWithCredentialsV2({ routeParam: 'name' }),
	destroyEnvironment
);

// Delete environment
router.delete('/name/:name',
	authorize({ resource: 'aws_environment', action: 'delete', params: [{type: 'route', key: 'name'}] }),
 	getProviderWithCredentialsV2({ routeParam: 'name' }),
	deleteEnvironment
);

// Dry-run environment
router.post(
	'/name/:name/version/:version/dry-run',
	authorize({ resource: 'aws_environment_deployment', action: 'dry_run', params: [{type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	dryRunEnvironment
);

// Deploy environment
router.post(
	'/name/:name/deploy',
	authorize({ resource: 'aws_environment_deployment', action: 'deploy', params: [{type: 'route', key: 'name'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	deployEnvironment
);

// Activate environment
router.post('/name/:name/activate',
	authorize({ resource: 'aws_environment', action: 'activate', params: [{type: 'route', key: 'name'}, {type: 'body', key: 'version'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	activateEnvironment
);

// Set environment status
router.patch('/name/:name/status',
	authorize({ resource: 'aws_environment', action: 'set_state', params: [{type: 'route', key: 'name'}] }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	setEnvironmentState
);

// Get the actual resources of the environment deployed on the Cloud
router.get('/name/:name/resources',
	authorize({ resource: 'aws_environment', action: 'get', params: [{type: 'route', key: 'name'}] }),
 	getProviderWithCredentialsV2({ routeParam: 'name' }),
 	getEnvironmentResources
);

// Verify ns records
router.post('/name/:name/verify',
	getProviderWithCredentialsV2({ routeParam: 'name' }),
	verifyNsRecords
);

// Clone an environment
// router.post('/name/:name/clone', controller.cloneEnvironment);

module.exports = router;
