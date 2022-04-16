// TODO: DELETE
const express = require('express');
const router = express.Router();

const providerApi = require('./accountProviderAPI');
const awsController = require('./awsAccountProviderController');

// config/provider apis
// router.get('/config/provider', providerApi.getProviderSummaries); // moved
// router.get('/config/provider/credentials', providerApi.getProviderCredentials); // Not gonna move
// router.get('/config/provider/isenabled', providerApi.getIsEnabled);
// router.get('/config/provider/name', providerApi.getEnabledProviders); // moved
// router.get('/config/provider/status', providerApi.getProviderStatus); // moved

// router.patch('/config/provider', providerApi.updateProvider);

// router.delete('/config/provider/name/:name', awsController.deleteProvider); // moved
// // following route should only be used from infrastructure-worker
// router.post('/config/provider/destroyed', awsController.deleteProviderAfterJobDone);  // moved
// router.post('/config/provider/aws', awsController.addProvider); // moved
// router.post('/config/provider/status', providerApi.updateProviderStatus); // moved

module.exports = router;
