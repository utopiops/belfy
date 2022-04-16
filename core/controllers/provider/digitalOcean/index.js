"use strict";
const router = require('express').Router();
const { access } = require('../../../middlewares/planManager');

const { handler: addDigitalOceanProvider } = require('./addDigitalOceanProvider');
const { handler: updateDigitalOceanProviderCredentials } = require('./updateDigitalOceanProviderCredentials');


router.post(
  '/',
  access({ resource: 'provider', action: 'create' }),
  addDigitalOceanProvider
);

router.patch('/displayName/:displayName/credentials', updateDigitalOceanProviderCredentials);

module.exports = router;