// TODO: DELETE
const constants = require('../../utils/constants');
const config = require('../../utils/config').config;
const ObjectId = require('mongoose').Types.ObjectId;
const Provider = require('../../db/models/provider');
const queueService = require('../../queue');
const tokenService = require('../../utils/auth/tokenService');
const uuidv4 = require('uuid/v4');
const awsAccountService = require('../../services/account/awsAccount');
const yup = require('yup');
const AWS = require('aws-sdk');
const awsApiVersions = require('../../utils/awsApiVersions');

// Function to add a provider
exports.addProvider = async (req, res, next) => {
	try {
		const accountId = tokenService.getAccountIdFromToken(req);
		const userId = tokenService.getUserIdFromToken(req);
		const displayName = req.body.displayName;
		AWS.config.update({
			accessKeyId: req.body.accessKeyId,
			secretAccessKey: req.body.secretAccessKey
		});
		const sts = new AWS.STS({ apiVersion: awsApiVersions.sts });
		const userIdentity = await sts.getCallerIdentity().promise();
		console.log(userIdentity);
		const backend = {
			name: req.body.name,
			accessKeyId: req.body.accessKeyId,
			secretAccessKey: req.body.secretAccessKey,
			cloudProviderAccountId: userIdentity.Account,
			region: req.body.region
		};
		await awsAccountService.addProvider(backend, accountId, userId, displayName);
		res.sendStatus(constants.statusCodes.ok);
	} catch (error) {
		// console.log(error);
		console.log(`error: ${error.message || error.body}`);
		res.status(constants.statusCodes.ise).send({
			error
		});
	}
};

// Function to delete a provider
exports.deleteProvider = async (req, res) => {
	const accountId = tokenService.getAccountIdFromToken(req);
	const userId = tokenService.getUserIdFromToken(req);
	const displayName = req.params.name;

	var provider;
	try {
		const result = await Provider.canDeleteProvider(accountId, displayName);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.notFound);
				return;
			} else if (result.message == "We can't delete provider") {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		}
		provider = result.output.provider;
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
		return;
	}
	console.log(provider);

	if (provider.status !== constants.resourceStatus.ready) {
		try {
			const providerId = new ObjectId(provider._id);
			await Provider.deleteProvider(providerId);
			res.sendStatus(constants.statusCodes.ok);
			return;
		} catch (error) {
			console.error(error.message);
			res.sendStatus(constants.statusCodes.ise);
			return;
		}
	}

	const jobPath = constants.jobPaths.destroyApplicationAwsProviderV2;
	const message = {
		jobPath,
		jobDetails: {
			accountId,
			userId,
			details: {
				name: provider.backend.name,
				displayName,
				region: provider.backend.region,
				bucketName: provider.backend.bucketName,
				dynamodbName: provider.backend.dynamodbName,
				kmsKeyId: provider.backend.kmsKeyId,
				stateKey: provider.backend.stateKey,
				credentials: provider.backend.credentials
			}
		}
	};
	const options = {
		userId,
		accountId,
		path: jobPath
	};

	try {
		const jobId = await queueService.sendMessage(config.queueName, message, options);
		res.send(jobId);
	} catch (error) {
		console.error(`error: ${error.message}`);
		res.status(constants.statusCodes.ise).send('Failed to schedule the job!');
	}
};

// Function to delete a provider after destroy job done
// This endpoint recieves request from infrasteructure only
exports.deleteProviderAfterJobDone = async (req, res) => {
	const accountId = req.body.accountId;
	const providerName = req.body.displayName;

	try {
		const result = await Provider.canDeleteProvider(accountId, providerName);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.notFound);
				return;
			} else if (result.message == "We can't delete provider") {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		}
		const providerId = new ObjectId(result.output.provider._id);
		await Provider.deleteProvider(providerId);
		res.sendStatus(constants.statusCodes.ok);
		return;
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
		return;
	}
};
