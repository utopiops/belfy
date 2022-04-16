const express = require('express');
const router = express.Router();

const api = require('./mongoDbAPI');

router.post('/', api.create);

module.exports = router;