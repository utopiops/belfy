const express = require('express');
const router = express.Router();

const controller = require('./authController');

// app routes
router.post('/apps/service_account/token', controller.getServiceAccountToken);
router.post('/apps/token', controller.getAppToken);
router.post('/apps/register', controller.registerApp);


// account routes
router.post('/register', controller.register);
router.post('/verify', controller.verifyEmail);
router.post('/login', controller.login);
router.post('/forgot_password', controller.forgotPassword);
router.post('/reset_password', controller.resetPassword);
router.post('/change_password', controller.changePassword);

module.exports = router;