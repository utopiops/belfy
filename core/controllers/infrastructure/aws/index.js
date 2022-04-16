const express = require("express");
const router = express.Router();
const rds = require('./rds');
const ssm = require('./ssm');
const acm = require("./acm");
const ec2 = require("./ec2");
const iam = require("./iam");
const ecs = require("./ecs");
const cloudWatch = require('./cloudWatch');
const route53 = require('./route53');
const autoscaling = require("./autoscaling");
const mongodb = require("./database");
const api = require('./awsAPI');
const elasticache = require('./elasticache');
const costExplorer = require('./costExplorer');

router.post('/config/preferences', api.setPreferences);
router.post('/config/credentials', api.setCredentials);
router.get('/ec2', api.getAllEc2);
router.get('/summary', api.getSummary);


router.use('/rds', rds);
router.use('/ssm', ssm);
router.use("/acm", acm);
router.use("/ec2", ec2);
router.use("/iam", iam);
router.use("/ecs", ecs);
router.use("/cloudWatch", cloudWatch);
router.use('/route53', route53);
router.use("/autoscaling", autoscaling);
router.use("/elasticache", elasticache);
router.use("/costExplorer", costExplorer);


// databases ------------------------------------
router.use("/database/mongodb", mongodb);


module.exports = router;
