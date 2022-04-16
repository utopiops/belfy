var express = require('express');
var router = express.Router();

var api = require('./route53API');

router.get('/listHostedZonesByName', api.listHostedZonesByName);

module.exports = router;