const express = require("express");
const router = express.Router();
const { getProviderWithCredentialsV2 } = require("../../middlewares/getProviderV2");
const { authorize } = require('../../middlewares/accessManager');
const { access } = require('../../middlewares/planManager');

const { handler: listApplicationDeployments } = require('./listApplicationDeployments');
const { handler: listApplicationDeploymentsByDate } = require('./listApplicationDeploymentsByDate');
const { handler: getApplicationDeploymentsSummary } = require('./getApplicationDeploymentsSummary');
const { handler: getApplicationSummary } = require('./getApplicationSummary');
const { handler: getApplicationLatestDeployment } = require('./getApplicationLatestDeployment');
const { handler: listApplications } = require('./listApplications');
const { handler: activateApplication } = require('./activateApplication');
const { handler: deleteApplication } = require('./deleteApplication');
const { handler: deleteDynamicApplication } = require('./deleteDynamicApplication');
const { handler: listDynamicApplications } = require('./listDynamicApplications');
const { handler: getApplicationDetailsForTF } = require('./getApplicationDetailsForTF');
const { handler: listApplicationVersions } = require('./listApplicationVersions');
const { handler: dryRunApplication } = require('./dryRunApplication');
const { handler: deployApplication } = require('./deployApplication');
const { handler: destroyApplication } = require('./destroyApplication');
const { handler: setApplicationState } = require('./setApplicationState');
const { handler: getApplicationResources } = require('./getApplicationResources');
const { handler: createOrUpdateEcsApplication } = require('./createOrUpdateEcsApplication');
const { handler: createOrUpdateEksBackgroundJobApplication } = require('./createOrUpdateEksBackgroundJobApplication');
const { handler: createOrUpdateEksWebServiceApplication } = require('./createOrUpdateEksWebServiceApplication');
const { handler: createOrUpdateS3WebsiteApplication } = require('./createOrUpdateS3WebsiteApplication');
const { handler: createOrUpdateClassicBakedApplication } = require('./createOrUpdateClassicBakedApplication');
const { handler: createOrUpdateAzureStaticWebsiteApplication } = require('./createOrUpdateAzureStaticWebsiteApplication');
const { handler: createCiJob } = require('./createCiJob');
const { handler: setApplicationJenkinsState } = require('./setApplicationJenkinsState');
const { handler: setDynamicApplicationJenkinsState } = require('./setDynamicApplicationJenkinsState');
const { handler: saveBuildTime } = require('./saveBuildTime');
const { handler: createPipeline } = require('./createPipeline');
const { handler: listS3Objects } = require("./listS3Objects");

const { handler: disableAzureHttps } = require('./disableAzureHttps');
const { handler: checkAzureHttpsDisabled } = require('./checkAzureHttpsDisabled');

/**
 * @swagger
 * /v3/applications/deployment/application:
 *   get:
 *     description: List all application deployments
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.get(
  "/deployment/application",
  authorize({ resource: 'application_deployment', action: 'get' }),
  listApplicationDeployments
);

/**
 * @swagger
 * /v3/applications/deployment/application/summary:
 *   get:
 *     description: List all application deployments by date
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.get(
  "/deployment/application/summary",
  authorize({ resource: 'application_deployment', action: 'get' }),
  listApplicationDeploymentsByDate
);

/**
 * @swagger
 * /v3/applications/deployment/environment/name/:environmentName/application/name/:applicationName/summary:
 *   get:
 *     description: List one application deployments by date
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.get(
  "/deployment/environment/name/:environmentName/application/name/:applicationName/summary",
  authorize({ resource: 'application_deployment', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ]}),
  getApplicationDeploymentsSummary
);

/**
 * @swagger
 * /v3/applications/deployment/environment/name/:environmentName/application/name/:applicationName:
 *   get:
 *     description: Get Applications Latest Deployment
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.get(
  "/deployment/environment/name/:environmentName/application/name/:applicationName",
  authorize({ resource: 'application_deployment', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  getApplicationLatestDeployment
);

/// Environment Application---------------------------------------------------------------------------------------------------
/**
 * @swagger
 * /v3/applications/deployment/environment/name/:environmentName/application:
 *   get:
 *     description: list all Applications for an specific environment
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.get(
  "/environment/name/:environmentName/application",
  authorize({ resource: 'application', action: 'get', params: [ { type: 'route', key: 'environmentName' } ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  listApplications
);

/**
 * @swagger
 * /v3/applications/environment/application:
 *   get:
 *     description: list all Applications
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.get("/environment/application", authorize({ resource: 'application', action: 'get' }), listApplications);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/summary:
 *   get:
 *     description: Get summary of an application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: object
 *        400:
 *          description: bad request
*/
router.get(
  "/environment/name/:environmentName/application/name/:applicationName/summary",
  authorize({ resource: 'application', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  getApplicationSummary
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/activate:
 *   post:
 *     description: Activate a version of application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/name/:applicationName/activate",
  authorize({ resource: 'application', action: 'activate', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' }, { type: 'body', key: 'version'} ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  activateApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName:
 *   delete:
 *     description: Delete application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.delete(
  "/environment/name/:environmentName/application/name/:applicationName",
  authorize({ resource: 'application', action: 'delete', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  deleteApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/dynamic/name/:dynamicName:
 *   delete:
 *     description: Delete application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.delete(
  "/environment/name/:environmentName/application/name/:applicationName/dynamic/name/:dynamicName",
  authorize({ resource: 'application', action: 'delete', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' }, { type: 'route', key: 'dynamicName' } ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  deleteDynamicApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/dynamic-names:
 *   get:
 *     description: List dynamic applications
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.get(
  "/environment/name/:environmentName/application/name/:applicationName/dynamic-names",
  authorize({resource: 'application', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  listDynamicApplications
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/tf:
 *   get:
 *     description: Get the tf suitable detail of the application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.get(
  [
    "/environment/name/:environmentName/application/name/:applicationName/tf",
    "/environment/name/:environmentName/application/name/:applicationName/version/:version"
  ],
  authorize({ resource: 'application', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  getApplicationDetailsForTF
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/versions:
 *   get:
 *     description: List the versions of the application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.get(
  "/environment/name/:environmentName/application/name/:applicationName/versions",
  authorize({ resource: 'application', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  listApplicationVersions
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/dry-run:
 *   post:
 *     description: Dry-run application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/name/:applicationName/dry-run",
  authorize({ resource: 'application_deployment', action: 'dry_run', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  dryRunApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/deploy:
 *   post:
 *     description: Deploy application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/name/:applicationName/deploy",
  // authorize({ resource: 'application_deployment', action: 'deploy', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  deployApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/destroy:
 *   post:
 *     description: Destroy application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/name/:applicationName/destroy",
  authorize({ resource: 'application_deployment', action: 'destroy', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  destroyApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/state:
 *   post:
 *     description: Set application state
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/name/:applicationName/state",
  authorize({resource: 'application', action: 'set_state', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  setApplicationState
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/resources:
 *   get:
 *     description: Get the actual resources for application deployed on the Cloud
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.get(
  "/environment/name/:environmentName/application/name/:applicationName/resources",
  authorize({ resource: 'application', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  getApplicationResources
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/ecs:
 *   post:
 *     description: Create an ECS application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/ecs",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'create_ecs', params: [ { type: 'route', key: 'environmentName' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateEcsApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/ecs/version/:version:
 *   post:
 *     description: Create an ECS application version
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/ecs/version/:version",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'update_ecs', params: [ { type: 'route', key: 'environmentName' }, { type: 'body', key: 'app_name'}, { type: 'route', key: 'version' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateEcsApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/ecs/version/:version:
 *   put:
 *     description: edit an ECS application version
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.put(
  "/environment/name/:environmentName/application/ecs/version/:version",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'update_ecs', params: [ { type: 'route', key: 'environmentName' }, { type: 'body', key: 'app_name'}, { type: 'route', key: 'version' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateEcsApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/eksweb:
 *   post:
 *     description: Create an EKS website application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/eksweb",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'create_eks_web_service', params: [ { type: 'route', key: 'environmentName' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateEksWebServiceApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/eksweb/version/:version:
 *   post:
 *     description: Create an EKS website application version
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/eksweb/version/:version",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'update_eks_web_service', params: [ { type: 'route', key: 'environmentName' }, { type: 'body', key: 'app_name'}, { type: 'route', key: 'version' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateEksWebServiceApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/eksweb/version/:version:
 *   put:
 *     description: edit an EKS website application version
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.put(
  "/environment/name/:environmentName/application/eksweb/version/:version",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'update_eks_web_service', params: [ { type: 'route', key: 'environmentName' }, { type: 'body', key: 'app_name'}, { type: 'route', key: 'version' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateEksWebServiceApplication
);


/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/eksbackground:
 *   post:
 *     description: Create an EKS background job application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/eksbackground",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'create_eks_background_job', params: [ { type: 'route', key: 'environmentName' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateEksBackgroundJobApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/eksbackground/version/:version:
 *   post:
 *     description: Create an EKS background job application version
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/eksbackground/version/:version",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'update_eks_background_job', params: [ { type: 'route', key: 'environmentName' }, { type: 'body', key: 'app_name'}, { type: 'route', key: 'version' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateEksBackgroundJobApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/eksbackground/version/:version:
 *   put:
 *     description: edit an EKS background job application version
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.put(
  "/environment/name/:environmentName/application/eksbackground/version/:version",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'update_eks_background_job', params: [ { type: 'route', key: 'environmentName' }, { type: 'body', key: 'app_name'}, { type: 'route', key: 'version' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateEksBackgroundJobApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/s3web:
 *   post:
 *     description: Create an S3 website application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/s3web",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'create_s3_website', params: [ { type: 'route', key: 'environmentName' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateS3WebsiteApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/s3web/version/:version:
 *   post:
 *     description: Create an S3 website application version
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/s3web/version/:version",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'update_s3_website', params: [ { type: 'route', key: 'environmentName' }, { type: 'body', key: 'app_name'}, { type: 'route', key: 'version' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateS3WebsiteApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/s3web/version/:version:
 *   put:
 *     description: edit an S3 website application version
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.put(
  "/environment/name/:environmentName/application/s3web/version/:version",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'update_s3_website', params: [ { type: 'route', key: 'environmentName' }, { type: 'body', key: 'app_name'}, { type: 'route', key: 'version' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateS3WebsiteApplication
);

// Create classic baked application and add to the environment {:name}
/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/classic-baked:
 *   post:
 *     description: Create a classic baked application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/classic-baked",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'create_classic_baked', params: [ { type: 'route', key: 'environmentName' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateClassicBakedApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/classic-baked/version/:version:
 *   post:
 *     description: Create a classic baked application version
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/classic-baked/version/:version",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'update_classic_baked', params: [ { type: 'route', key: 'environmentName' }, { type: 'body', key: 'app_name'}, { type: 'route', key: 'version' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateClassicBakedApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/classic-baked/version/:version:
 *   put:
 *     description: edit an classic baked application version
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.put(
  "/environment/name/:environmentName/application/classic-baked/version/:version",
  access({ resource: 'managed_application', action: 'create' }),
  authorize({ resource: 'application', action: 'update_classic_baked', params: [ { type: 'route', key: 'environmentName' }, { type: 'body', key: 'app_name'}, { type: 'route', key: 'version' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateClassicBakedApplication
);

// Create azure static website application and add to the environment {:name}
/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/azure-static-website:
 *   post:
 *     description: Create a azure static website application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/azure-static-website",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateAzureStaticWebsiteApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/azure-static-website/version/:version:
 *   post:
 *     description: Create a azure static website application version
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/azure-static-website/version/:version",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateAzureStaticWebsiteApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/azure-static-website/version/:version:
 *   put:
 *     description: edit an azure static website application version
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.put(
  "/environment/name/:environmentName/application/azure-static-website/version/:version",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createOrUpdateAzureStaticWebsiteApplication
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/listS3Objects:
 *   put:
 *     description: list S3 objects for an application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
*/
router.get(
  "/environment/name/:environmentName/application/name/:applicationName/listS3Objects",
  authorize({ resource: 'application', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  listS3Objects
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/version/:version/createPipeline:
 *   put:
 *     description: create ci file for an application
 *     responses: 
 *        200:
 *          description: ok
 *          schema:
 *           type: object
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/name/:applicationName/version/:version/createPipeline",
  authorize({ resource: 'application', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createPipeline
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/pipeline:
 *   post:
 *     description: create ci job for an application
 *     responses: 
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/name/:applicationName/pipeline",
  authorize({ resource: 'application', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createCiJob
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/save-build-time:
 *   post:
 *     description: save build time of an application
 *     responses: 
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/name/:applicationName/save-build-time",
  authorize({ resource: 'application', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  saveBuildTime
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/jenkins/state:
 *   post:
 *     description: Set application jenkins state
 *     responses: 
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/name/:applicationName/jenkins/state",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  setApplicationJenkinsState
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/dynamic/name/:dynamicName/jenkins/state:
 *   post:
 *     description: Set dynamic application jenkins state
 *     responses: 
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/name/:applicationName/dynamic/name/:dynamicName/jenkins/state",
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  setDynamicApplicationJenkinsState
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/disable-https:
 *   post:
 *     description: disable azure static website application https
 *     responses: 
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/name/:applicationName/disable-https",
  authorize({ resource: 'application', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  disableAzureHttps
);

/**
 * @swagger
 * /v3/applications/environment/name/:environmentName/application/name/:applicationName/https-disabled:
 *   get:
 *     description: check that azure static website https disabled or not
 *     responses: 
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
*/
router.post(
  "/environment/name/:environmentName/application/name/:applicationName/https-disabled",
  authorize({ resource: 'application', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'applicationName' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  checkAzureHttpsDisabled
);

module.exports = router;
