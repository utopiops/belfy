const express     = require('express');
const router      = express.Router();

const controller  = require('./webhookController');

router.post('/git/github', controller.receiveGithubWebhook);
router.post('/git/gitlab', controller.receiveGitlabWebhook);

module.exports = router;