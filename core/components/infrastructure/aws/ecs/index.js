const api       = require('./ecsAPI');
const express   = require('express');

const router    = express.Router();

router.post('/listServiceTasks', api.listServiceTasks);
router.post('/stopTask', api.stopTask);

module.exports = router;