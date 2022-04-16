const controller  = require('./serviceAccountController');
const express     = require('express');
const router      = express.Router();


router.get('', controller.getAll);
router.get('/:name', controller.getServiceAccount);
router.post('/', controller.add);
router.delete('/:name', controller.deleteServiceAccount);

module.exports = router;
