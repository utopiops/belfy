"use strict";
const router = require('express').Router();
const { access } = require('../../../middlewares/planManager');

const { handler: addAzureProvider } = require('./addAzureProvider');
const { handler: updateAzureProviderCredentials } = require('./updateAzureProviderCredentials');


router.post(
  '/',
  access({ resource: 'provider', action: 'create' }),
  addAzureProvider
);

router.patch('/displayName/:displayName/credentials', updateAzureProviderCredentials);

module.exports = router;