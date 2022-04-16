const controller  = require('./integrationController');
const express     = require('express');
const router      = express.Router();


router.get('/', controller.getIntegrationsList);
router.post('/', controller.add);
router.get('/:name', controller.get);
router.put('/:name', controller.update);
router.delete('/:name', controller.deleteIntegration);
router.get('/callbacks/git/github', controller.githubCallbacks);
router.get('/callbacks/git/gitlab', controller.gitlabCallbacks);
router.get('/callbacks/git/bitbucket', controller.bitbucketCallbacks);
// ! for internal use only! 
router.get('/accountId/:accountId', controller.listIntegrationsByAccountId);
router.get('/:name/accountId/:accountId', controller.get);

module.exports = router;
