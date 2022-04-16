var express = require('express');
var router = express.Router();

const { handler: addAccessToken } = require('./addAccessToken');
const { handler: deleteAccessToken } = require('./deleteAccessToken');
const { handler: getAccessTokenAccount } = require('./getAccessTokenAccount');
const { handler: getAccountAccessTokens } = require('./getAccountAccessTokens');

// Add access token to an account
router.post('/', addAccessToken)

// Delete an accessToken
router.delete('/token/:token', deleteAccessToken);

// Get account of an accessToken
router.get('/token/:token/account', getAccessTokenAccount);

// Get accessTokens of an account
router.get('/', getAccountAccessTokens);

module.exports = router;
