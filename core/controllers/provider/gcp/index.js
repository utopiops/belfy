"use strict";
const router = require('express').Router();
const { access } = require('../../../middlewares/planManager');

const { handler: addGcpProvider } = require('./addGcpProvider');
const { handler: updateGcpProviderCredentials } = require('./updateGcpProviderCredentials');


router.post(
  '/',
  access({ resource: 'provider', action: 'create' }),
  addGcpProvider
);

router.patch('/displayName/:displayName/credentials', updateGcpProviderCredentials);

module.exports = router;