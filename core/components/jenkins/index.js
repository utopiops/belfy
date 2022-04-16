var express = require('express');
var router = express.Router();
var api = require('./jenkinsAPI');

router.get('/', api.getAll);
router.post('/save', api.saveJenkins);
router.post('/config', api.setConfigs);
router.get('/views', api.getAllViews);
router.get('/views/:name/jobs', api.getView);
router.get('/jobs', api.getAllJobs);

module.exports = router;