const controller  = require('./groupController');
const express     = require('express');
const router      = express.Router();


router.get('', controller.getGroupsList);
router.get('/:name', controller.getGroup);
router.post('/', controller.addGroup);
router.delete('/:name', controller.deleteGroup);
router.put('/:name', controller.updateGroup);
router.post('/:name/users/remove', controller.removeUsersFromGroup);
router.post('/:name/users', controller.addUsersToGroup);
router.get('/:name/users', controller.getGroupMembers);
router.get('/:name/users/notmembers', controller.getGroupNotMembers);


module.exports = router;
