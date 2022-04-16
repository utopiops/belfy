const express = require("express");
const router = express.Router();
const { access } = require('../../middlewares/planManager');

const { handler: listApplications } = require('./listApplications');
const { handler: getApplicationDetails } = require('./getApplicationDetails');
const { handler: getApplicationResources } = require('./getApplicationResources');
const { handler: getApplicationDetailsInternal } = require('./getApplicationDetailsInternal');
const { handler: createOrUpdateStaticWebsiteApplication } = require("./createOrUpdateStaticWebsiteApplication");
const { handler: destroyApplication } = require("./destroyApplication");
const { handler: createOrUpdateCustomDomainStaticWebsite } = require("./createOrUpdateCustomDomainStaticWebsite");
const { handler: createOrUpdateDockerApplication } = require("./createOrUpdateDockerApplication");
const { handler: createOrUpdateFunctionApplication } = require("./createOrUpdateFunctionApplication");
const { handler: updateFunctionApplicationHistory } = require("./updateFunctionApplicationHistory");
const { handler: deleteApplication } = require("./deleteApplication");
const { handler: setState } = require("./setState");
const { handler: createPipeline } = require("./createPipeline");
const { handler: setApplicationJenkinsState } = require("./setApplicationJenkinsState");
const { handler: checkNameAvailablity } = require("./checkNameAvailablity");
const { handler: saveBuildTime } = require("./saveBuildTime");
const { handler: claimStaticWebsiteApplication } = require("./claimStaticWebsiteApplication");
const { handler: getApplicationBandwidth } = require('./getApplicationBandwidth');
const { handler: listApplicationsBandwidth } = require('./listApplicationsBandwidth');


// List applications
router.get("/", listApplications);

// Get applicaiton details
router.get("/name/:applicationName", getApplicationDetails);

// Get applicaiton resources
router.get("/name/:applicationName/resources", getApplicationResources);

// Create static website application
router.post("/application/static-website",
  access({ resource: 'fully_managed_application', action: 'create' }),
  createOrUpdateStaticWebsiteApplication
);

// Update static website application
router.put("/application/static-website", createOrUpdateStaticWebsiteApplication);

// Create custom domain static website application
router.post("/application/custom-domain-static-website",
  access({ resource: 'fully_managed_application', action: 'create' }),
  createOrUpdateCustomDomainStaticWebsite
);

// Update custom domain static website application
router.put("/application/custom-domain-static-website", createOrUpdateCustomDomainStaticWebsite);

// Create docker application
router.post("/application/docker",
  access({ resource: 'fully_managed_application', action: 'create' }),
  createOrUpdateDockerApplication
);

// Update docker application
router.put("/application/docker", createOrUpdateDockerApplication);

// Destroy application
router.post("/name/:applicationName/destroy", destroyApplication);

// Create function application
router.post("/application/function",
  access({ resource: 'fully_managed_application', action: 'create' }),
  createOrUpdateFunctionApplication
);

// update function application
router.put("/application/function", createOrUpdateFunctionApplication);

// Set application jenkins state
router.post("/name/:applicationName/jenkins/state", setApplicationJenkinsState);

// Update function application history
router.put("/application/function/name/:applicationName", updateFunctionApplicationHistory);

// Delete application
router.delete("/name/:applicationName", deleteApplication);

// Set application state
router.post("/accountId/:accountId/name/:applicationName/state", setState);

// Create jenkins pipeline
router.post("/name/:applicationName/pipeline", createPipeline);

// Check application name availablity
router.post("/name-check", checkNameAvailablity);

// Save application build time
router.post("/name/:applicationName/save-build-time", saveBuildTime);

// Claim static website application
router.put("/name/:applicationName/claim", claimStaticWebsiteApplication);

// For internal use only
// Get application details
router.get("/application/:applicationName", getApplicationDetailsInternal);

// Get custom domain static website bandwidth usage
router.get("/domain/:domainName/application/:applicationName/bandwidth", getApplicationBandwidth);

// List custom domain static websites bandwidth usage
router.get("/bandwidth", listApplicationsBandwidth);


module.exports = router;