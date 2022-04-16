const controller = require('./userController');
const express = require('express');
const router = express.Router();

router.get('', controller.getUsersList);
router.get('/:username', controller.getUser);
router.get('/:username/groups', controller.getUserGroups);
router.post('/', controller.addUser);
router.put('/:username', controller.updateUser);
// router.patch('/myPassword', controller.setPassword);  // This is moved to app.js and doesn't need authentication
router.delete('/:username', controller.deleteUser);

module.exports = router;
