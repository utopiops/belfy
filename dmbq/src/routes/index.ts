import express from 'express';
import constants from '../utils/constants';

// routers
import redis from '../controllers/redis';
import database from '../controllers/database';
import domain from '../controllers/domain';
import fmStaticWebsite from '../controllers/fm_static_website';
import environment from '../controllers/environment';
import certificate from '../controllers/certificate';
import ecs from '../controllers/ecs';
import s3Website from '../controllers/s3_website';
import flashSetup from '../controllers/flash_setup';
import dynamicApplication from '../controllers/dynamic_application';

// middleware
import introspectOAuth2Token from '../middleware/introspectOAuth2Token';
import getAccountDetails from '../middleware/getAccountDetails';

const router = express.Router();

router.use('/redis', introspectOAuth2Token, getAccountDetails, redis);
router.use('/domain', introspectOAuth2Token, getAccountDetails, domain);
router.use('/aws/database', introspectOAuth2Token, getAccountDetails, database);
router.use('/utopiops/static-website', introspectOAuth2Token, getAccountDetails, fmStaticWebsite);
router.use('/environment', introspectOAuth2Token, getAccountDetails, environment);
router.use('/certificate', introspectOAuth2Token, getAccountDetails, certificate);
router.use('/managed/ecs', introspectOAuth2Token, getAccountDetails, ecs);
router.use('/managed/s3', introspectOAuth2Token, getAccountDetails, s3Website);
router.use('/flash-setup', introspectOAuth2Token, getAccountDetails, flashSetup);
router.use('/dynamic-application', introspectOAuth2Token, getAccountDetails, dynamicApplication);

// health check route
router.get('/health', (req, res) => {
  res.sendStatus(constants.statusCodes.ok);
});

export default router;
