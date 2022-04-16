var express = require('express');
var router = express.Router();
var aws = require('./aws');

router.use('/aws', aws)

module.exports = router;