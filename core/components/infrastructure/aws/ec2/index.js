const api       = require('./ec2Controller');
const express   = require('express');

const router    = express.Router();


// router.get('/listKeyPairs', api.listKeyPairs);
router.get('/listEc2KeyPairsByEnvName/:environmentName', api.listEc2KeyPairsByEnvName);

module.exports = router;