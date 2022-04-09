import express from 'express';
import constants from '../utils/constants';

// routers
import login from '../controllers/login';
import jwks from '../controllers/jwks';
import introspect from '../controllers/introspect';
import internalToken from '../controllers/internalToken';

const router = express.Router();

router.post('/login', login);
router.get('/.well-known/jwks.json', jwks);
router.post('/oauth2/introspect', introspect);
router.post('/oauth2/token', internalToken);

// health check route
router.get('/health', (req, res) => {
  res.sendStatus(constants.statusCodes.ok);
});

export default router;
