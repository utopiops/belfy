const express = require('express');
const router = express.Router();

const controller = require('./healthCheckController');


router.get('/', controller.check);

module.exports = router;