const express   = require('express');

const router    = express.Router();

const { getProviderWithCredentialsV4 } = require('../../../../middlewares/getProviderV4');
const {handler: getMetricData} = require('./getMetricData');



router.post('/getMetricData/:environmentName',  getProviderWithCredentialsV4({ routeParam: 'environmentName' }), getMetricData);

module.exports = router;