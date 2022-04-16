// TODO: DELETE
const constants = require('../../utils/constants');
const ObjectId = require('mongoose').Types.ObjectId;
const Provider = require('../../db/models/provider');
const queueService = require('../../queue');
const tokenService = require('../../utils/auth/tokenService');
const uuidv4 = require('uuid/v4');
const AWS = require('aws-sdk');
const awsApiVersions = require('../../utils/awsApiVersions');

exports.getProviderStatus = getProviderStatus;
exports.updateProviderStatus = updateProviderStatus;
exports.getProviderCredentials = getProviderCredentials;
exports.updateProvider = updateProvider;
exports.getProviderSummaries = getProviderSummaries;
exports.getProviderSummary = getProviderSummary;
exports.getEnabledProviders = getEnabledProviders;
exports.getIsEnabled = getIsEnabled;

// TODO: Move the AWS stuff to the awsAccountProviderController

// Function to get the status of the provider
async function getProviderStatus(req, res, next) {
	try {
		const accountId = tokenService.getAccountIdFromToken(req);
		const name = req.query.name;
		const filter = { accountId: new ObjectId(accountId), 'backend.name': name };
		const provider = await Provider.findOne(filter).exec();
		const data = provider.status;
		res.send(data);
	} catch (error) {
		console.log(`error: ${error.message || error.body}`);
		res.status(400).send({
			error
		});
	}
}

// Function to update the status of the provider
async function updateProviderStatus(req, res, next) {
	try {
		const { displayName, accountId, status, kmsKeyId } = req.body;
		const filter = { accountId: new ObjectId(accountId), displayName };
		const provider = await Provider.findOne(filter).exec();
		if (!!!provider) {
			return res.sendStatus(404);
		}
		const update = Object.assign({}, provider.toObject());
		update.status = status;
		update.backend.kmsKeyId = kmsKeyId.replace(/['"]+/g, '');
		await provider.updateOne(update);
		// await Provider.findOneAndUpdate(filter, { status, 'backend.kmsKeyId': kmsKeyId});
		console.log(`updated the kmsKeyId with ${kmsKeyId}`);
		res.sendStatus(200);
	} catch (error) {
		console.log(`error: ${error.message || error.body}`);
		res.status(400).send({
			error
		});
	}
}

// Function
async function getProviderCredentials(req, res, next) {
	try {
		const { displayName, accountId } = req.query;
		var filter;
		if (displayName === 'aws') {
			filter = { accountId: new ObjectId(accountId), 'backend.name': displayName };
		} else {
			filter = { accountId: new ObjectId(accountId), displayName };
		}
		const provider = await Provider.findOne(filter).exec();
		const data = provider.backend.credentials;
		res.send(data);
	} catch (error) {
		console.log(`error: ${error.message || error.body}`);
		res.status(400).send({
			error
		});
	}
}
// Function to update the credentials (NOTE: This is implemented only for AWS at the moment)
async function updateProvider(req, res, next) {
	try {
		const accountId = tokenService.getAccountIdFromToken(req);
		const filter = { accountId: new ObjectId(accountId), 'backend.name': req.body.name };
		const provider = await Provider.findOne(filter).exec();
		if (!!!provider) {
			return res.sendStatus(404);
		}

		// Check if the credentials provided by user belong to the same cloud provider account ID
		AWS.config.update({
			accessKeyId: req.body.accessKeyId,
			secretAccessKey: req.body.secretAccessKey
		});
		const sts = new AWS.STS({ apiVersion: awsApiVersions.sts });
		const newUserIdentity = await sts.getCallerIdentity().promise();
		if (newUserIdentity.Account !== provider.backend.cloudProviderAccountId) {
			return res.sendStatus(400);
		}

		const update = Object.assign({}, provider.toObject());
		update.backend.accessKeyId = req.body.accessKeyId;
		update.backend.secretAccessKey = req.body.secretAccessKey;
		await provider.updateOne(update);
		res.sendStatus(200);
	} catch (error) {
		console.log(`error: ${error.message || error.body}`);
		res.status(400).send({
			error
		});
	}
}

// Return the enable providers' summaries
async function getProviderSummaries(req, res, next) {
	try {
		const accountId = tokenService.getAccountIdFromToken(req);
		const data = await new Provider().getSummary(accountId, req.query.name);
		res.send(data);
	} catch (error) {
		console.log(`error: ${error.message || error.body}`);
		res.status(400).send({
			error
		});
	}
}

// Return the enable providers' summaries
async function getProviderSummary(req, res, next) {
	try {
		const accountId = tokenService.getAccountIdFromToken(req);
		const data = new Provider().getProviderSummary(accountId, req.query.name);
		res.send(data);
	} catch (error) {
		console.log(`error: ${error.message || error.body}`);
		res.status(400).send({
			error
		});
	}
}

// Return the names of the enabled providers
async function getEnabledProviders(req, res, next) {
	try {
		const accountId = tokenService.getAccountIdFromToken(req);
		const filter = { accountId: new ObjectId(accountId) };
		const providers = await Provider.aggregate([
			{
				$match: filter
			},
			{
				$group: {
					_id: '$accountId'
				}
			},
			{
				$lookup: {
					from: 'providers',
					localField: '_id',
					foreignField: 'accountId',
					as: 'names'
				}
			},
			{
				$project: {
					_id: 0,
					names: '$names.backend.name'
				}
			}
		]).exec();
		const data = providers && providers.length ? providers[0].names : null;
		res.send(data);
	} catch (error) {
		console.log(`error: ${error.message || error.body}`);
		res.status(400).send({
			error
		});
	}
}

// Function to check if a particular provider is enabled for this account
async function getIsEnabled(req, res, next) {
	try {
		const accountId = tokenService.getAccountIdFromToken(req);
		const filter = { accountId: new ObjectId(accountId), 'backend.name': req.body.name };
		const count = await Provider.countDocuments(filter).exec();
		res.send(count > 0);
	} catch (error) {
		console.log(`error: ${error.message}`);
		res.status(400).send({
			error
		});
	}
}
