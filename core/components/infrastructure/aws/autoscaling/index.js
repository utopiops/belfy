const api       = require('./autoscalingAPI');
const express   = require('express');
const router    = express.Router();

router.post('/listAutoScalingGroupInstances', api.listAutoScalingGroupInstances);

module.exports = router;