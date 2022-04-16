const express = require('express');
const { getProviderWithCredentialsV2 } = require('../../../middlewares/getProviderV2');
const { authorize } = require('../../../middlewares/accessManager');
const { access } = require('../../../middlewares/planManager');

const { handler: createEnvironment } = require('./createEnvironment');
const { handler: updateVnetDdosProtection } = require('./updateVnetDdosProtection');
const router = express.Router();

router.post('/',
  access({ resource: 'environment', action: 'create' }),
  authorize({ resource: 'azure_environment', action: 'create' }),
  createEnvironment
);

// Update vnet ddos protection (update existing version)
router.put('/name/:name/version/:version/ddos_protection',
  authorize({ resource: 'azure_environment', action: 'create' }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
  updateVnetDdosProtection
);

// Update vnet ddos protection (create new version)
router.post('/name/:name/version/:version/ddos_protection',
  authorize({ resource: 'azure_environment', action: 'create' }),
	getProviderWithCredentialsV2({ routeParam: 'name' }),
  updateVnetDdosProtection
);


module.exports = router;