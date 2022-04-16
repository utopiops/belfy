const express = require('express');
const router = express.Router();
const { access } = require('../../middlewares/planManager');

const { getProviderWithCredentialsV3 } = require('../../middlewares/getProviderV3');
const { handler: listEnvironmentECRs } = require('./listEnvironmentECRs');
const { handler: listEnvironmentECRVersions } = require('./listEnvironmentECRVersions');
const { handler: getEcrSummary } = require('./getEcrSummary');
const { handler: getECRDetails } = require('./getECRDetails');
const { handler: getEcrResources } = require('./getEcrResources');
const { handler: listAccountECRs } = require('./listAccountECRs');
const { handler: createOrUpdateECR } = require('./createOrUpdateECR');
const { handler: activateECR } = require('./activateECR');
const { handler: dryRunECR } = require('./dryRunECR');
const { handler: setECRState } = require('./setECRState');
const { handler: deployECR } = require('./deployECR');
const { handler: destroyECR } = require('./destroyECR');
const { handler: deleteECR } = require('./deleteECR');

// list ECRs by account
router.get('/', listAccountECRs);

// list ECRs by environment
router.get(
  '/environment/name/:environmentName',
  getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
  listEnvironmentECRs,
);

// list ECR versions by Environment
router.get(
  '/environment/name/:environmentName/ecr/name/:ecrName/versions',
  getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
  listEnvironmentECRVersions,
);

// get details for an ECR
router.get(
  '/environment/name/:environmentName/ecr/name/:ecrName/version/:version',
  getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
  getECRDetails,
);

// get resources for an ECR
router.get(
	'/environment/name/:environmentName/ecr/name/:ecrName/resources',
	getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
	getEcrResources
);

// create or update ECR
router.post(
  [
    '/environment/name/:environmentName/ecr', // Create
    '/environment/name/:environmentName/ecr/version/:version', // Add version
  ],
  access({ resource: 'redis', action: 'create' }),
  getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
  createOrUpdateECR,
);

// Update a version of an existing elasticache which hasn't been activated
router.put(
  '/environment/name/:environmentName/ecr/version/:version',
  access({ resource: 'redis', action: 'create' }),
  getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
  createOrUpdateECR,
);

// Delete the ECR
router.delete(
  '/environment/name/:environmentName/ecr/name/:ecrName',
  getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
  deleteECR,
);

// Activate a version of ECR
router.post(
  '/environment/name/:environmentName/ecr/name/:ecrName/activate',
  getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
  activateECR,
);

// Dry-run a version of ECR
router.post(
  '/environment/name/:environmentName/ecr/name/:ecrName/dry-run',
  getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
  dryRunECR,
);

// Deploy a version of ECR
router.post(
  '/environment/name/:environmentName/ecr/name/:ecrName/deploy',
  getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
  deployECR,
);

// Destroy a version of ECR
router.post(
  '/environment/name/:environmentName/ecr/name/:ecrName/destroy',
  getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
  destroyECR,
);

// Set ECR state
router.post(
  '/environment/name/:environmentName/ecr/name/:ecrName/setState',
  getProviderWithCredentialsV3({ routeParam: 'environmentName' }),
  setECRState,
);

// Get ECR summary
router.get(
  "/environment/name/:environmentName/ecr/name/:ecrName/summary",
  getProviderWithCredentialsV3({ routeParam: "environmentName" }),
  getEcrSummary
);

module.exports = router;
