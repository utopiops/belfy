import express from 'express';
import setup from './setup';
import remove from './remove';

const router = express.Router();

router.post('/setup', setup);
router.post('/remove', remove);

export default router;
