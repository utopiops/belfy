const AuditModel = require('./audit');
const { runQueryHelper } = require('../helpers');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

module.exports = {
	addUserLog,
	getloginHistories,
	getUserLoginHistory
};

async function addUserLog(userId, ip) {
	const runQuery = async () => {
		const newUserLog = {
			user: ObjectId(userId),
			ip,
		};
		const doc = new AuditModel(newUserLog);
		return await doc.save();
	};

	return await runQueryHelper(runQuery);
}

async function getloginHistories(accountId) {
	const runQuery = async () => {
		return await AuditModel.aggregate([
			{
				$lookup: {
					from: "users",
         	localField: "user",
         	foreignField: "_id",
         	as: "user_info"
				}
			},
			{
				$match: {
					'user_info.accountId': accountId
				}
			},
			{
				$unwind: "$user_info"
			},
			{
				$project: {
					'user_info.username': 1,
					ip: 1,
					loginTime: 1
				}
			},
			{
				$sort: {
					loginTime: -1
				}
			}
		]);
	};

	const extractOutput = (result) => [
		...result.map((doc) => ({
			loginTime: doc.loginTime,
			ip: doc.ip,
			username: doc.user_info.username
		}))
	];
	return await runQueryHelper(runQuery, extractOutput);
}

async function getUserLoginHistory(accountId, username) {
	const runQuery = async () => {
		return await AuditModel.aggregate([
			{
				$lookup: {
					from: "users",
         	localField: "user",
         	foreignField: "_id",
         	as: "user_info"
				}
			},
			{
				$match: {
					'user_info.username': username,
					'user_info.accountId': accountId,
				}
			},
			{
				$unwind: "$user_info"
			},
			{
				$project: {
					'user_info.username': 1,
					ip: 1,
					loginTime: 1
				}
			},
			{
				$sort: {
					loginTime: -1
				}
			}
		]);
	};

	const extractOutput = (result) => [
		...result.map((doc) => ({
			loginTime: doc.loginTime,
			ip: doc.ip,
			username: doc.user_info.username
		}))
	];
	return await runQueryHelper(runQuery, extractOutput);
}
