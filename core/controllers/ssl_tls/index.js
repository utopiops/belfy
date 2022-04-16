const express = require("express");
const router = express.Router();
const {
  getProviderWithCredentialsV2,
} = require("../../middlewares/getProviderV2");
const { authorize } = require('../../middlewares/accessManager');

const { handler: listCertificates } = require("./listCertificates");
const { handler: listVersions } = require("./listVersions");
const { handler: deleteCertificate } = require("./deleteCertificate");
const { handler: getCertificateDetails } = require("./getCertificateDetails");
const { handler: getCertificateSummary } = require('./getCertificateSummary');
const { handler: activateCertificate } = require("./activateCertificate");
const { handler: deployCertificate } = require("./deployCertificate");
const { handler: destroyCertificate } = require("./destroyCertificate");
const { handler: setState } = require("./setState");
const { handler: listEnvironment } = require("./listEnvironment");
const { handler: createCertificate } = require("./createCertificate");
const { handler: getCertificateResources } = require("./getCertificateResources");

/**
 * @swagger
 * /v2/ssl_tls/:
 *   get:
 *     description: Retrieves the list of certificates
 *     responses:
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
 */
router.get("/",
  authorize({resource:"certificate", action:"get"}),
  listCertificates
);

/**
 * @swagger
 * /v2/ssl_tls/environment/name/:environmentName/certificate/identifier/:certificateIdentifier:
 *   get:
 *     description: Retrieves the versions of a certificate
 *     responses:
 *        200:
 *          description: ok
 *          schema:
 *           type: array
 *        400:
 *          description: bad request
 */
router.get(
  "/environment/name/:environmentName/certificate/identifier/:certificateIdentifier",
  authorize({resource:"certificate", action:"get", params: [{type: 'route', key: 'environmentName'}, {type: 'route', key: 'certificateIdentifier'}]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  listVersions
);

/**
 * @swagger
 * /v2/ssl_tls/environment/name/:environmentName/certificate/identifier/:certificateIdentifier:
 *   delete:
 *     description: Deletes a certificate
 *     responses:
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
 */
router.delete(
  "/environment/name/:environmentName/certificate/identifier/:certificateIdentifier",
  authorize({resource:"certificate", action:"delete", params: [{type: 'route', key: 'environmentName'}, {type: 'route', key: 'certificateIdentifier'}]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  deleteCertificate
);

/**
 * @swagger
 * /v2/ssl_tls/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/version/:version:
 *   get:
 *     description: Retrieves the details of a certificate
 *     responses:
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
 */
router.get(
  "/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/version/:version",
  authorize({resource:"certificate", action:"get", params: [{type: 'route', key: 'environmentName'}, {type: 'route', key: 'certificateIdentifier'}, {type: 'route', key: 'version'}]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  getCertificateDetails
);

/**
 * @swagger
 * /v2/ssl_tls/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/version/:version/activate:
 *   post:
 *     description: Activates a version of certificate
 *     responses:
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
 */
router.post(
  "/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/version/:version/activate",
  authorize({resource:"certificate", action:"activate", params: [{type: 'route', key: 'environmentName'}, {type: 'route', key: 'certificateIdentifier'}, {type: 'route', key: 'version'}]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  activateCertificate
);

/**
 * @swagger
 * /v2/ssl_tls/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/deploy:
 *   post:
 *     description: Deploys the active version of a certificate
 *     responses:
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
 */
router.post(
  "/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/deploy",
  authorize({resource:"certificate_deployment", action:"deploy", params: [{type: 'route', key: 'environmentName'}, {type: 'route', key: 'certificateIdentifier'}]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  deployCertificate
);

/**
 * @swagger
 * /v2/ssl_tls/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/destroy:
 *   post:
 *     description: Destroys the active version of a certificate
 *     responses:
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
 */
router.post(
  "/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/destroy",
  authorize({resource:"certificate_deployment", action:"destroy", params: [{type: 'route', key: 'environmentName'}, {type: 'route', key: 'certificateIdentifier'}]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  destroyCertificate
);

/**
 * @swagger
 * /v2/ssl_tls/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/destroy:
 *   patch:
 *     description: Sets the state of the certificate (after deploy or destroy)
 *     responses:
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
 */
router.patch(
  "/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/state",
  authorize({resource:"certificate", action:"set_state", params: [{type: 'route', key: 'environmentName'}, {type: 'route', key: 'certificateIdentifier'}]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  setState
);

/**
 * @swagger
 * /v2/ssl_tls/environment:
 *   get:
 *     description: Retrieves the list of environments that support SSL/TLS certificate (from our pov)
 *     responses:
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
 */
router.get("/environment",
  authorize({resource:"certificate", action:"get"}),
  listEnvironment
);

/**
 * @swagger
 * /v2/ssl_tls/environment/name/:environmentName/certificate:
 *   post:
 *     description: Creates a certificate
 *     responses:
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
 */
router.post(
  "/environment/name/:environmentName/certificate",
  authorize({resource:"certificate", action:"create", params: [{type: 'route', key: 'environmentName'}]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createCertificate
);

/**
* @swagger
* /v2/ssl_tls/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/version/:version:
*   post:
*     description: Creates a certificate version
*     responses:
*        200:
*          description: ok
*        400:
*          description: bad request
*/
router.post(
  "/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/version/:version",
  authorize({resource:"certificate", action:"update", params: [{type: 'route', key: 'environmentName'}, {type: 'route', key: 'certificateIdentifier'}, {type: 'route', key: 'version'}]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createCertificate
);

/**
 * @swagger
 * /v2/ssl_tls/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/version/:version:
 *   put:
 *     description: Edit a certificate version
 *     responses:
 *        200:
 *          description: ok
 *        400:
 *          description: bad request
 */
router.put(
  "/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/version/:version",
  authorize({resource:"certificate", action:"update", params: [{type: 'route', key: 'environmentName'}, {type: 'route', key: 'certificateIdentifier'}, {type: 'route', key: 'version'}]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createCertificate
);

// two following endpoints only exist for backwards compatibility
router.post(
  "/environment/name/:environmentName/certificate/:certificateIdentifier/version/:version",
  authorize({resource:"certificate", action:"update", params: [{type: 'route', key: 'environmentName'}, {type: 'route', key: 'certificateIdentifier'}, {type: 'route', key: 'version'}]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createCertificate
);

router.put(
  "/environment/name/:environmentName/certificate/:certificateIdentifier/version/:version",
  authorize({resource:"certificate", action:"update", params: [{type: 'route', key: 'environmentName'}, {type: 'route', key: 'certificateIdentifier'}, {type: 'route', key: 'version'}]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  createCertificate
);

router.get(
  "/environment/name/:environmentName/certificate/:certificateIdentifier/summary",
  authorize({ resource: 'certificate', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'certificateIdentifier' } ]}),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  getCertificateSummary
);

router.get(
  "/environment/name/:environmentName/certificate/:certificateIdentifier/resources",
  authorize({ resource: 'certificate', action: 'get', params: [ { type: 'route', key: 'environmentName' }, { type: 'route', key: 'certificateIdentifier' } ] }),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  getCertificateResources
);

module.exports = router;
