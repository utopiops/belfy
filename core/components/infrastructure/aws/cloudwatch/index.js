const api       = require('./cloudwatchAPI');
const express   = require('express');

const router    = express.Router();

router.post('/getMetricData/:environmentName', api.getMetricData);

module.exports = router;