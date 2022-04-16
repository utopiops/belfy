const api = require('./ssmAPI');
const apiV2 = require('./ssmAPI_v2');
const express = require('express');
const { getProviderWithCredentials } = require('../../../../middlewares/getProvider');

var router = express.Router();

router.get('/getParametersValues', api.getParametersValues);
router.get('/v2/getParametersValues', getProviderWithCredentials({ queryStringParam: 'environmentName' }), apiV2.getParametersValues);

module.exports = router;