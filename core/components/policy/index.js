const controller  = require('./serviceAccountController');
const express     = require('express');
const passport    = require('../../passport');
const router      = express.Router();


router.get('', passport.authenticate('jwt', {session: false}), controller.getAll);
// router.get('/:username', passport.authenticate('jwt', {session: false}), controller.getUser);
// router.get('/:username/groups', passport.authenticate('jwt', {session: false}), controller.getUserGroups);
router.post('/', passport.authenticate('jwt', {session: false}), controller.add);
// router.put('/:username', passport.authenticate('jwt', {session: false}), controller.updateUser);
// router.patch('/myPassword', controller.setPassword);
// router.delete('/:username', passport.authenticate('jwt', {session: false}), controller.deleteUser);

module.exports = router;
