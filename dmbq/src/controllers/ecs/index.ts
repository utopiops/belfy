import express from 'express';
import setup from './setup';

const router = express.Router();

router.post('/setup', setup);

export default router;
