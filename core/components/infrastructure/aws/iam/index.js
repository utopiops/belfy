var express = require('express');
var router = express.Router();

var api = require('./iamAPI');

router.get('/roles', api.getAllRoles);
router.get('/listEc2IamRolesByEnvName/:environmentName', api.listEc2IamRolesByEnvName);

module.exports = router;