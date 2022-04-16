// TODO: DELETE
const constants = require('../../utils/constants');
const ObjectId = require('mongoose').Types.ObjectId;
const Provider = require('../../db/models/provider');
const queueService = require('../../queue');
const tokenService = require('../../utils/auth/tokenService');
const { config } = require('../../utils/config');
const yup = require('yup');
const AWS = require('aws-sdk');
const awsApiVersions = require('../../utils/awsApiVersions');

exports.getDetails = getDetails;
exports.updateCredentials = updateCredentials;
exports.deployProvider = deployProvider;
exports.testProvider = testProvider;

// Function to get the status of the provider
async function getDetails(req, res, next) {
	const name = req.params.name;
	const accountId = tokenService.getAccountIdFromToken(req);
	try {
		let result = await Provider.getDetails(accountId, name);
		console.log(result);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.notFound);
				return;
			} else {
				res.sendStatus(constants.statusCodes.ise);
			}
		} else {
			res.send(result.output.provider);
		}
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
	}
}

// Function to update the credentials (NOTE: This is implemented only for AWS at the moment)
async function updateCredentials(req, res, next) {
	const displayName = req.params.name;
	const accountId = tokenService.getAccountIdFromToken(req);

	const validationSchema = yup.object().shape({
		accessKeyId: yup.string().required(),
		secretAccessKey: yup.string().required()
	});
	try {
		validationSchema.validateSync(req.body);
	} catch (err) {
		res.status(constants.statusCodes.ue).send(err.message);
		return;
	}
	const credentials = req.body;

	try {
		let result = await Provider.updateCredentials(accountId, displayName, credentials);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			res.sendStatus(constants.statusCodes.ok);
		}
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
	}
}

async function deployProvider(req, res) {
	const name = req.params.name;
	const accountId = tokenService.getAccountIdFromToken(req);
	const userId = tokenService.getUserIdFromToken(req);
	try {
		let result = await Provider.getDetails(accountId, name);
		console.log(result);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.notFound);
				return;
			} else {
				res.sendStatus(constants.statusCodes.ise);
			}
		} else {
			const provider = result.output.provider;

			const filter = { accountId: new ObjectId(accountId), displayName: name };
			const p = await Provider.findOne(filter).exec();
			const credentials = p.backend.credentials;

			const message = {
				jobType: constants.topics.addProvider, // todo: remove this
				jobPath: constants.jobPaths.createApplicationAwsProviderV2,
				jobDetails: {
					accountId,
					userId,
					details: {
						name: provider.name,
						region: provider.region,
						bucketName: provider.bucketName,
						dynamodbName: provider.dynamodbName,
						kmsKeyId: provider.kmsKeyId,
						credentials
					},
					extras: {
						operation: constants.operations.create
					}
				}
			};
			console.log(`message`, JSON.stringify(message, null, 2));
			await queueService.sendMessage(config.queueName, message, {
				accountId,
				userId,
				path: constants.jobPaths.undecided
			}); // todo: Set a proper job path instead of job type
			res.sendStatus(200);
		}
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
	}
}
//
async function testProvider(req, res, next) {
	const validationSchema = yup.object().shape({
		accessKeyId: yup.string().required(),
		secretAccessKey: yup.string().required()
	});

	try {
		validationSchema.validateSync(req.body);
	} catch (err) {
		res.status(constants.statusCodes.ue).send(err.message);
		return;
	}

	try {
		AWS.config.update({
			accessKeyId: req.body.accessKeyId,
			secretAccessKey: req.body.secretAccessKey
		});
		const sts = new AWS.STS({ apiVersion: awsApiVersions.sts });
		await sts.getCallerIdentity().promise();
		res.sendStatus(constants.statusCodes.ok);
	} catch (error) {
		console.log(`error: ${error.message}`);
		res.status(400).send({
			error
		});
	}
}
