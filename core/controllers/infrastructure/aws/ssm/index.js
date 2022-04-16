const api = require('./ssmAPI');
const express = require('express');
const { handler: getParametersValues } = require('./getParametersValues');
const { getProviderWithCredentialsV4 } = require('../../../../middlewares/getProviderV4');

var router = express.Router();

router.get('/getParametersValues', api.getParametersValues);
router.get('/v2/getParametersValues', getProviderWithCredentialsV4({ queryStringParam: 'environmentName' }), getParametersValues);

module.exports = router;