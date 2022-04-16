// TODO: DELETE
var express = require('express');
var router = express.Router();
var api = require('./applicationAPI');

router.get('/environments/provider', api.getEnvironmentsProvider);
router.get('/environments/basic-settings', api.getEnvironmentsBasicSettings);
router.get('/environments', api.getEnvironmentsSummary);
router.get('/', api.getAll);
router.post('/save', api.saveApplication);
router.post('/create', api.createApplication);
router.post('/environments', api.createEnvironment);
router.get('/environments/:name/activations', api.getEnvironmentActivationHistory);
router.get('/environments/:name/region', api.getEnvironmentRegion);
router.get('/environments/:name/version', api.getEnvironmentVersionsSummary);
router.get('/environments/:name/version/:version', api.getApplication);
router.get('/environments/:name/version/:version/provider', api.getEnvironmentProvider);
router.get('/environments/:name/version/:version/apps', api.getEnvironmentApplicationsSummary);
router.get('/environments/:name/version/:version/apps/:appName', api.getEnvironmentApplication);
router.post('/environments/:name/version/:version/apps', api.addApplication);
router.delete('/environments/:name/version/:version/apps/:appName', api.deleteApplication);
router.put('/environments/:name/version/:version/apps/:appName', api.updateApplication);
router.post('/environments/:name/version/:version/dry-run', api.dryRun);
router.post('/environments/:name/version/:version/activate', api.activateApplication);


module.exports = router;