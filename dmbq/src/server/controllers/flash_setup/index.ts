import express from 'express';
import stage1 from './stage1';
import stage2 from './stage2';

const router = express.Router();

router.get('/stage-1', stage1);
router.get('/stage-2', stage2);

export default router;
