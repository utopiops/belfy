var express = require('express');
var router = express.Router();
var api = require('./utilitiesAPI');

router.post('/dispatch', api.dispatchUtilityJob);

module.exports = router;