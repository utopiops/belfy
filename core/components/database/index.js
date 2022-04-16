const controller = require('./databaseController');
const express = require('express');
const router = express.Router();

router.get([ '/type/environment', '/type/environment/name/:environmentName' ], controller.listEnvironmentDatabases);
router.get('/environment/name/:environmentName/name/:name/versions', controller.listEnvironmentDatabaseVersions);
router.get('/environment/name/:environmentName/name/:name/version/:version', controller.getEnvironmentDatabaseDetails);
// Delete the database
router.delete('/environment/name/:environmentName/database/name/:databaseName', controller.deleteDatabase);

// Note: none of these two are used at the moment, remove this comment when they are. As part of a solution I added them and now I just wanna keep them to avoid wasting the effort?!
router.get('/environment/name/:environmentName/database/name/:databaseName/resources', controller.getDatabaseResources);
router.get('/environment/name/:environmentName/database/name/:databaseName/kind', controller.getDatabaseKind);

module.exports = router;
