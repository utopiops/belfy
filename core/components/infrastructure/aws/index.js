const express     = require('express');
const router      = express.Router();

const acm         = require('./acm');
const cw          = require('./cloudwatch');
const ec2         = require('./ec2');
const api         = require('./awsAPI');
const iam         = require('./iam');
const route53     = require('./route53');
const ssm         = require('./ssm');
const mongodb     = require('../aws/database');
const ecs         = require('./ecs');
const autoscaling = require('./autoscaling');

router.post('/config/preferences', api.setPreferences);
router.post('/config/credentials', api.setCredentials);
router.get('/ec2', api.getAllEc2);
router.get('/summary', api.getSummary);

// getParameters, api.getAllEc2
router.use('/ssm', ssm);
router.use('/iam', iam);
router.use('/acm', acm);
router.use('/cloudWatch', cw);
router.use('/route53', route53);
router.use('/v2/ec2', ec2);
router.use('/ecs', ecs);
router.use('/autoscaling', autoscaling);

// databases ------------------------------------
router.use('/database/mongodb', mongodb);


module.exports = router;