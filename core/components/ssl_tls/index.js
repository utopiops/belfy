const express = require('express');
const router = express.Router();
const sslTlsController = require('./sslTlsController');

// Retrieves the list of certificates
router.get('/', sslTlsController.list);

// Retrieves the versions of a certificate
router.get('/environment/name/:environmentName/certificate/identifier/:certificateIdentifier', sslTlsController.listVersions);

// Deletes a certificate
router.delete('/environment/name/:environmentName/certificate/identifier/:certificateIdentifier', sslTlsController.deleteCertificate);

// Retrieves the details of a certificate
router.get('/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/version/:version', sslTlsController.certificateDetails);

// Activates a version of certificate
router.post('/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/version/:version/activate', sslTlsController.activateCertificate);

// Deploys the active version of a certificate
router.post('/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/deploy', sslTlsController.deployCertificate);

// Destroys the active version of a certificate
router.post('/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/destroy', sslTlsController.destroyCertificate);

// Sets the state of the certificate (after deploy or destroy)
router.patch('/environment/name/:environmentName/certificate/identifier/:certificateIdentifier/state', sslTlsController.setState);

// Retrieves the list of environments that support SSL/TLS certificate (from our pov)
router.get('/environment', sslTlsController.listEnvironment);

// Creates a certificate
router.post(['/environment/name/:environmentName/certificate',
  '/environment/name/:environmentName/certificate/:certificateIdentifier/version/:version'
  ], sslTlsController.createCertificate);

router.put('/environment/name/:environmentName/certificate/:certificateIdentifier/version/:version', sslTlsController.createCertificate);


module.exports = router;
