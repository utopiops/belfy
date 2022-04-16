const express = require('express');
const router  = express.Router();

const controller  = require('./jobController');

router.post('/', controller.addJob);
router.put('/:id/status', controller.updateJobStatus);
router.get('/:id/status', controller.getJobStatus);
router.get('/active/path/:path', controller.getActiveJobsForPath);
router.get('/active', controller.getActiveJobs);

module.exports = router;
