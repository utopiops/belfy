var express = require('express');
var router = express.Router();
const passport = require('../../passport');

var api = require('./jiraAPI');

router.post('/config', api.setConfig);
router.get('/boards/:id', api.getAllIssues);
router.get('/boards', api.getAllBoards);

module.exports = router;