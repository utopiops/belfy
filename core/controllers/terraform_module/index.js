const express = require('express');
const router = express.Router();
const { getProviderWithCredentialsV4 } = require('../../middlewares/getProviderV4');
const { access } = require('../../middlewares/planManager');

const { handler: createOrUpdateTerraformModule } = require('./createOrUpdateTerraformModule');
const { handler: getTerraformModuleSummary } = require('./getTerraformModuleSummary');
const { handler: deleteTerraformModule } = require('./deleteTerraformModule');
const { handler: activateTerraformModule } = require('./activateTerraformModule');
const { handler: dryRunTerraformModule } = require('./dryRunTerraformModule');
const { handler: deployTerraformModule } = require('./deployTerraformModule');
const { handler: destroyTerraformModule } = require('./destroyTerraformModule');
const { handler: listTerraformModules } = require('./listTerraformModules');
const { handler: listTerraformModuleVersions } = require('./listTerraformModuleVersions');
const { handler: getTerraformModuleDetailsVersion } = require('./getTerraformModuleDetailsVersion');
const { handler: setTerraformModuleState } = require('./setTerraformModuleState');
const { handler: listAccountTerraformModules } = require('./listAccountTerraformModules');


router.get(
	'/environment/name/:environmentName/terraform_module/name/:tfModuleName/version/:version',
	getProviderWithCredentialsV4({ routeParam: 'environmentName' }),
	getTerraformModuleDetailsVersion
);


router.get(
	'/type/environment',
	listAccountTerraformModules
);

// list Terraform Modules
router.get(
	'/environment/name/:environmentName',
	getProviderWithCredentialsV4({ routeParam: 'environmentName' }),
	listTerraformModules
);

// list Terraform Module versions
router.get(
	'/environment/name/:environmentName/terraform_module/name/:tfModuleName/versions',
	getProviderWithCredentialsV4({ routeParam: 'environmentName' }),
	listTerraformModuleVersions
);

// Get terraform module summary
router.get('/environment/name/:environmentName/terraform_module/name/:tfModuleName/summary',
	getProviderWithCredentialsV4({ routeParam: 'environmentName' }),
	getTerraformModuleSummary
);

router.post(
	[
		'/environment/name/:environmentName', // Create a new terraform module
		'/environment/name/:environmentName/version/:version' // Add a new revision to terraform module
	],
  access({ resource: 'terraform_module', action: 'create' }),
	getProviderWithCredentialsV4({ routeParam: 'environmentName' }),
	createOrUpdateTerraformModule
);

// Update a version of an existing terraform module which hasn't been activated
router.put(
	'/environment/name/:environmentName/version/:version',
  access({ resource: 'terraform_module', action: 'create' }),
	getProviderWithCredentialsV4({ routeParam: 'environmentName' }),
	createOrUpdateTerraformModule
);

// Delete the Terraform Module
router.delete(
	'/environment/name/:environmentName/terraform_module/name/:tfModuleName',
	getProviderWithCredentialsV4({ routeParam: 'environmentName' }),
	deleteTerraformModule
);

// Activate a version of Terraform Module
router.post(
	'/environment/name/:environmentName/terraform_module/name/:tfModuleName/activate',
	getProviderWithCredentialsV4({ routeParam: 'environmentName' }),
	activateTerraformModule
);

// Dry-run a version of Terraform Module
router.post(
	'/environment/name/:environmentName/terraform_module/name/:tfModuleName/dry-run',
	getProviderWithCredentialsV4({ routeParam: 'environmentName' }),
	dryRunTerraformModule
);

// Deploy a version of Terraform Module
router.post(
	'/environment/name/:environmentName/terraform_module/name/:tfModuleName/deploy',
	getProviderWithCredentialsV4({ routeParam: 'environmentName' }),
	deployTerraformModule
);

// Destroy a version of TerraformModule
router.post(
	'/environment/name/:environmentName/terraform_module/name/:tfModuleName/destroy',
	getProviderWithCredentialsV4({ routeParam: 'environmentName' }),
	destroyTerraformModule
);

// Set Terraform Module state
router.post(
	'/environment/name/:environmentName/terraform_module/name/:tfModuleName/state',
	getProviderWithCredentialsV4({ routeParam: 'environmentName' }),
	setTerraformModuleState
);



module.exports = router;
