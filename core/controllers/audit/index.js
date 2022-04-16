var express = require('express');
var router = express.Router();

const { handler: getloginHistories } = require('./getloginHistories');
const { handler: getUserLoginHistory } = require('./getUserLoginHistory');

// Get login history of all users
router.get('/login_history', getloginHistories);

// Get login history of one user
router.get('/login_history/:username', getUserLoginHistory);

module.exports = router;
