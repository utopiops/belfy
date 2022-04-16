const express = require('express');
const router = express.Router();
const { getProviderWithCredentialsV3 } = require('../../middlewares/getProviderV3');
const { authorize } = require('../../middlewares/accessManager');
const { access } = require('../../middlewares/planManager');

const { handler: listEnvironmentDatabases } = require('./listEnvironmentDatabases');
const { handler: listEnvironmentDatabaseVersions } = require('./listEnvironmentDatabaseVersions');
const { handler: getEnvironmentDatabaseDetails } = require('./getEnvironmentDatabaseDetails');
const { handler: getDatabaseSummary } = require('./getDatabaseSummary');
const { handler: getDatabaseResources } = require('./getDatabaseResources');
const { handler: listAccountDatabases } = require('./listAccountDatabases');
const { handler: getDatabaseKind } = require('./getDatabaseKind');
const { handler: createOrUpdateRDS } = require('./createOrUpdateRDS');
const { handler: activateDatabase } = require('./activateDatabase');
const { handler: dryRunDatabase } = require('./dryRunDatabase');
const { handler: getActiveDatabaseDetails } = require('./getActiveDatabaseDetails');
const { handler: setDatabaseState } = require('./setDatabaseState');
const { handler: deployDatabase } = require('./deployDatabase');
const { handler: destroyDatabase } = require('./destroyDatabase');
const { handler: deleteDatabase } = require('./deleteDatabase');

router.get(
	'/type/environment/name/:environmentName',
	authorize({ resource: 'database', action: 'get' }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	listEnvironmentDatabases
);

router.get('/type/environment',
	authorize({ resource: 'database', action: 'get' }),
 	listAccountDatabases
);

router.get(
	'/environment/name/:environmentName/name/:name/versions',
	authorize({ resource: 'database', action: 'get', params: [{ type: 'route', key: 'environmentName'}, {type: 'route', key: 'name'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	listEnvironmentDatabaseVersions
);

router.get(
	'/environment/name/:environmentName/name/:name/version/:version',
	authorize({ resource: 'database', action: 'get', params: [{ type: 'route', key: 'environmentName'}, {type: 'route', key: 'name'}, {type: 'route', key: 'version'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	getEnvironmentDatabaseDetails
);

// Note: none of these two are used at the moment, remove this comment when they are. As part of a solution I added them and now I just wanna keep them to avoid wasting the effort?!
router.get(
	'/environment/name/:environmentName/database/name/:databaseName/resources',
	authorize({ resource: 'database', action: 'get', params: [{ type: 'route', key: 'environmentName'}, {type: 'route', key: 'databaseName'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	getDatabaseResources
);

router.get(
	'/environment/name/:environmentName/database/name/:databaseName/kind',
	authorize({ resource: 'database', action: 'get', params: [{ type: 'route', key: 'environmentName'}, {type: 'route', key: 'databaseName'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	getDatabaseKind
);

router.post(
	'/environment/name/:environmentName/database/rds', // Create a new RDS
  access({ resource: 'database', action: 'create' }),
	authorize({ resource: 'database', action: 'create_rds', params: [{ type: 'route', key: 'environmentName'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	createOrUpdateRDS
);


router.post(
	'/environment/name/:environmentName/database/rds/version/:version', // Add a new revision to RDS
  access({ resource: 'database', action: 'create' }),
	authorize({ resource: 'database', action: 'update_rds', params: [{ type: 'route', key: 'environmentName'}, {type: 'route', key: 'version'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	createOrUpdateRDS
);


// Update a version of an existing RDS which hasn't been activated
router.put(
	'/environment/name/:environmentName/database/rds/version/:version',
  access({ resource: 'database', action: 'create' }),
	authorize({ resource: 'database', action: 'update_rds', params: [{ type: 'route', key: 'environmentName'}, {type: 'route', key: 'version'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	createOrUpdateRDS
);

// Activate a version of database
router.post(
	'/environment/name/:environmentName/database/name/:databaseName/activate',
	authorize({ resource: 'database', action: 'activate', params: [{ type: 'route', key: 'environmentName'}, {type: 'route', key: 'databaseName'}, {type: 'body', key: 'version'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	activateDatabase
);

// Get active database details
// Note: For now this route returns active or inactive versions
router.get(
	'/environment/name/:environmentName/database/name/:databaseName/tf',
	authorize({ resource: 'database', action: 'get', params: [{ type: 'route', key: 'environmentName'}, {type: 'route', key: 'databaseName'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	getActiveDatabaseDetails
);

// // Dry-run a version of database
router.post(
	'/environment/name/:environmentName/database/name/:databaseName/dry-run',
	authorize({ resource: 'database_deployment', action: 'dry_run', params: [{ type: 'route', key: 'environmentName'}, {type: 'route', key: 'databaseName'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	dryRunDatabase
);

// Deploy a version of database
router.post(
	'/environment/name/:environmentName/database/name/:databaseName/deploy',
	authorize({ resource: 'database_deployment', action: 'deploy', params: [{ type: 'route', key: 'environmentName'}, {type: 'route', key: 'databaseName'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	deployDatabase
);

// Destroy a version of database
router.post(
	'/environment/name/:environmentName/database/name/:databaseName/destroy',
	authorize({ resource: 'database_deployment', action: 'destroy', params: [{ type: 'route', key: 'environmentName'}, {type: 'route', key: 'databaseName'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	destroyDatabase
);

// Set database state
router.post(
	'/environment/name/:environmentName/database/name/:databaseName/state',
	authorize({ resource: 'database', action: 'set_state', params: [{ type: 'route', key: 'environmentName'}, {type: 'route', key: 'databaseName'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	setDatabaseState
);

// Delete the database
router.delete(
	'/environment/name/:environmentName/database/name/:databaseName',
	authorize({ resource: 'database', action: 'delete', params: [{ type: 'route', key: 'environmentName'}, {type: 'route', key: 'databaseName'}] }),
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	deleteDatabase
);


router.get(
  "/environment/name/:environmentName/database/name/:databaseName/summary",
  authorize({ resource: 'database', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'databaseName' } ]}),
  getProviderWithCredentialsV3({ routeParam: "environmentName" }),
  getDatabaseSummary
);

module.exports = router;
