const express = require('express');
const router = express.Router();
const controller = require('./applicationsV2Controller');
const ecsController = require('./createEcsApplication');
const s3WebsiteController = require('./s3WebsiteApplicationController');
const classicBakedController = require('./classicBakedApplicationController');
const rdsController = require('./rdsController');
const { getProviderWithCredentials } = require('../../middlewares/getProvider');

/**
 * @swagger
 * /v2/applications/deployment/application:
 *   get:
 *     description: List all application deployments
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.get('/deployment/application', controller.listApplicationDeployments);

/**
 * @swagger
 * /v2/applications/deployment/application/summary:
 *   get:
 *     description: List all application deployments by date
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.get('/deployment/application/summary', controller.listApplicationDeploymentsByDate);

router.get(
	'/deployment/environment/name/:environmentName/application/name/:applicationName',
	controller.getApplicationLatestDeployment
);

/// Environment ---------------------------------------------------------------------------------------------------
// Create environment
router.post('/environment', controller.createEnvironment);

// List environments
router.get('/environment', controller.listEnvironment);

// Get the credentials of the environment's provider
router.get('/environment/name/:name/provider/credentials',getProviderWithCredentials({ routeParam: 'name' }), controller.getEnvironmentProviderCredentials);

// Get list of providers with the same backend as the environment's provider
router.get('/environment/name/:name/provider/same_backend', controller.getProvidersWithSameBackend);

// Add ALB to the environment
router.post('/environment/name/:name/alb', controller.createAlb);

// Delete an ALB
router.delete('/environment/name/:name/alb/:albName', controller.deleteAlb);

// Add NLB to the environment
router.post('/environment/name/:name/nlb', controller.createNlb);

// Delete an NLB
router.delete('/environment/name/:name/nlb/:nlbName', controller.deleteNlb);

// Add listener to the environment ALB
router.patch('/environment/name/:name/alb/:albName/listener', controller.addListenerToAlb);

// Add listener to the environment ALB
router.delete('/environment/name/:name/alb/:albName/listener/port/:port', controller.deleteAlbListener);

// Update the environment ALB's listener's certificate
router.patch('/environment/name/:name/alb/:albName/listener/port/:port', controller.updateAlbListenerCertificate);

// Get the list of names of all the ALBs of the environment {:name}
router.get('/environment/name/:name/alb/name', controller.listAlbs);

// Add ECS cluster to the environment
router.post('/environment/name/:name/ecs_cluster', controller.createECSCluster);

// Add instance group to ECS cluster
router.post('/environment/name/:name/ecs_cluster/name/:clusterName/instance_group', controller.createEcsInstanceGroup);

// Delete instance group to ECS cluster
router.delete(
	'/environment/name/:name/ecs_cluster/name/:clusterName/instance_group/name/:igName',
	controller.deleteEcsInstanceGroup
);

// Delete ECS cluster
router.delete('/environment/name/:name/ecs_cluster/name/:clusterName', controller.deleteEcsCluster);

// Update ECS cluster's dependencies
router.put(
	'/environment/name/:name/ecs_cluster/name/:clusterName/dependencies',
	controller.updateEcsClusterDependencies
);

// Get the names of all of the ECS clusters of the environment {:name}
router.get('/environment/name/:name/ecs_cluster/name', controller.listEcsClusters);

// Get the environment details {:name}
router.get('/environment/name/:name', controller.getEnvironmentDetails);

// Delete environment
router.delete('/environment/name/:name', controller.deleteEnvironment);

// Lock environment
router.post('/environment/name/:name/lock', controller.lockEnvironment);

// Dry-run environment
router.post(
	'/environment/name/:name/dry-run',
	getProviderWithCredentials({ routeParam: 'name' }),
	controller.dryRunEnvironment
);

// Deploy environment
router.post(
	'/environment/name/:name/deploy',
	getProviderWithCredentials({ routeParam: 'name' }),
	controller.deployEnvironment
);

// Set environment status
router.patch('/environment/name/:name/status', controller.setEnvironmentStatus);

// Get the actual resources of the environment deployed on the Cloud
router.get('/environment/name/:name/resources', controller.getEnvironmentResources);

// Clone an environment
router.post('/environment/name/:name/clone', controller.cloneEnvironment);

/// Environment Application---------------------------------------------------------------------------------------------------
// List environment applications
router.get(
	[ '/environment/application', '/environment/name/:name/application' ],
	controller.listEnvironmentApplications
);

// Activate a version of application
router.post('/environment/name/:name/application/name/:applicationName/activate', controller.activateApplication);

// Delete application
router.delete('/environment/name/:name/application/name/:applicationName', controller.deleteApplication);

// Get the tf suitable detail of the application
router.get('/environment/name/:name/application/name/:applicationName/tf', controller.getApplicationDetailsForTF);

// List the versions of the application
router.get(
	'/environment/name/:name/application/name/:applicationName/versions',
	controller.listEnvironmentApplicationVersions
);

// Dry-run application
router.post(
	'/environment/name/:name/application/name/:applicationName/dry-run',
	getProviderWithCredentials({ routeParam: 'name' }),
	controller.dryRunApplication
);

// Deploy application
router.post(
	'/environment/name/:name/application/name/:applicationName/deploy',
	getProviderWithCredentials({ routeParam: 'name' }),
	controller.deployApplication
);

// Destroy application
router.post(
	'/environment/name/:name/application/name/:applicationName/destroy',
	getProviderWithCredentials({ routeParam: 'name' }),
	controller.destroyApplication
);

// Set application state
router.post('/environment/name/:name/application/name/:applicationName/state', controller.setApplicationState);

// Create ECS application and add to the environment {:name}
router.post(
	[ '/environment/name/:name/application/ecs', '/environment/name/:name/application/ecs/version/:version' ],
	ecsController.createOrUpdateEcsApplication
);

router.put('/environment/name/:name/application/ecs/version/:version', ecsController.createOrUpdateEcsApplication);

// Create S3 website application and add to the environment {:name}
router.post(
	[ '/environment/name/:name/application/s3web', '/environment/name/:name/application/s3web/version/:version' ],
	s3WebsiteController.createOrUpdateS3WebsiteApplication
);

router.put(
	'/environment/name/:name/application/s3web/version/:version',
	s3WebsiteController.createOrUpdateS3WebsiteApplication
);

// Create classic baked application and add to the environment {:name}
router.post(
	[
		'/environment/name/:name/application/classic-baked',
		'/environment/name/:name/application/classic-baked/version/:version'
	],
	classicBakedController.createOrUpdateClassicBakedApplication
);

router.put(
	'/environment/name/:name/application/classic-baked/version/:version',
	classicBakedController.createOrUpdateClassicBakedApplication
);

// Get the actual resources for application deployed on the Cloud
router.get('/environment/name/:name/application/name/:applicationName/resources',getProviderWithCredentials({ routeParam: 'name' }), controller.getApplicationResources);

/// Environment Database---------------------------------------------------------------------------------------------------

router.post(
	[
		'/environment/name/:name/database/rds', // Create a new RDS
		'/environment/name/:name/database/rds/version/:version' // Add a new revision to RDS
	],
	rdsController.createOrUpdateRDS
);

// Update a version of an existing RDS which hasn't been activated
router.put('/environment/name/:name/database/rds/version/:version', rdsController.createOrUpdateRDS);

// Activate a version of database
router.post('/environment/name/:name/database/name/:dbsName/activate', rdsController.activateDatabase);

// List environment databases
router.get('/environment/name/:name/database', rdsController.listDatabases);

// Get active database details
router.get('/environment/name/:name/database/name/:dbsName/tf', rdsController.getActiveDatabaseDetails);

// Dry-run a version of database
router.post(
	'/environment/name/:name/database/name/:dbsName/dry-run',
	getProviderWithCredentials({ routeParam: 'name' }),
	rdsController.dryRunDatabase
);
// Deploy a version of database
router.post(
	'/environment/name/:name/database/name/:dbsName/deploy',
	getProviderWithCredentials({ routeParam: 'name' }),
	rdsController.deployDatabase
);
// Destroy a version of database
router.post(
	'/environment/name/:name/database/name/:dbsName/destroy',
	getProviderWithCredentials({ routeParam: 'name' }),
	rdsController.destroyDatabase
);
// Set database state
router.post('/environment/name/:name/database/name/:dbsName/state', rdsController.setDatabaseState);

router.delete('/environment/name/:name/database/name/:dbsName', rdsController.deleteDatabase);

module.exports = router;
