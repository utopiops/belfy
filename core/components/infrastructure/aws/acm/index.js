const api       = require('./acmAPI');
const express   = require('express');

const router    = express.Router();


router.get('/listCertificates', api.listCertificates);
router.get('/v2/listCertificates', api.listCertificatesV2);
router.get('/v2/listCertificatesByEnvironmentName/:environmentName', api.listCertificatesByEnvironmentNameV2);

module.exports = router;