const AccessToken = require('./accessToken');
const { runQueryHelper } = require('../helpers');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const uuid = require('uuid/v4');

module.exports = {
	addAccessToken,
	getAccountAccessTokens,
  getAccessTokenAccount,
	deleteAccessToken
};

async function addAccessToken(accountId, userId) {
	const runQuery = async () => {
		const newAccessToken = {
      accountId: ObjectId(accountId),
			token: uuid(),
			createdBy: ObjectId(userId),
		};
		const doc = new AccessToken(newAccessToken);
		return await doc.save();
	};

	return await runQueryHelper(runQuery);
}

async function getAccountAccessTokens(accountId) {
	const runQuery = async () => {
    const filter = {
      accountId: ObjectId(accountId)
    }
    return await AccessToken.find(filter).exec();
	};
  const extractOutput = result => result
	return await runQueryHelper(runQuery, extractOutput);
}

async function getAccessTokenAccount(token) {
	const runQuery = async () => {
    const filter = {
      token
    }
    return await AccessToken.findOne(filter, { accountId: 1, createdBy: 1 }).exec();
	};
  const extractOutput = (result) => {
    return { accountId: result.accountId, userId: result.createdBy }
  }
  
	return await runQueryHelper(runQuery, extractOutput);
}

async function deleteAccessToken(token) {
	const runQuery = async () => {
    const filter = {
      token
    }
    return await AccessToken.findOneAndDelete(filter).exec();
	};
	return await runQueryHelper(runQuery);
}