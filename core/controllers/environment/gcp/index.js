const express = require('express');
const { getProviderWithCredentialsV2 } = require('../../../middlewares/getProviderV2');
const { authorize } = require('../../../middlewares/accessManager');
const { access } = require('../../../middlewares/planManager');

const { handler: createEnvironment } = require('./createEnvironment');
const router = express.Router();

router.post('/',
  access({ resource: 'environment', action: 'create' }),
  authorize({ resource: 'azure_environment', action: 'create' }),
  createEnvironment
);

module.exports = router;