const express = require('express');
const addNotification = require('./add_notification');
const router = express.Router();

router.post('/', addNotification);

module.exports = router;
