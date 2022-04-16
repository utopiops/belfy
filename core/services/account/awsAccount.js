const constants = require('../../utils/constants');
const logmetricService = require('../logmetric');
const Provider = require('../../db/models/provider');
const queueService = require('../../queue');
const uuidv4 = require('uuid/v4');
const { config } = require('../../utils/config');

exports.addProvider = async (backend, accountId, userId, displayName = '') => {
	const bucketName = uuidv4();
	const dynamodbName = uuidv4();
	const stateKey = uuidv4();
	const provider = new Provider({
		accountId,
		displayName,
		backend: {
			name: backend.name,
			accessKeyId: backend.accessKeyId,
			secretAccessKey: backend.secretAccessKey,
			cloudProviderAccountId: backend.cloudProviderAccountId,
			region: backend.region,
			bucketName,
			dynamodbName,
			stateKey
		}
	});
	await provider.save();
	// Add cloudwatch to the logmetrics
	const cloudwatch = {
		accountId,
		name: 'CloudWatch',
		serviceProvider: 'cloudwatch',
		isLogProvider: true,
		isMetricProvider: true
	};
	const ret = await logmetricService.add(cloudwatch);
	console.log(`ret: ${JSON.stringify(ret)}`);
	if (!ret) {
		// TODO: implement rollback
		throw new Error('Failed to add the logmetric provider');
	}
	const message = {
		jobType: constants.topics.addProvider, // todo: remove this
		jobPath: constants.jobPaths.createApplicationAwsProviderV2,
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
				credentials: {
					accessKeyId: backend.accessKeyId,
					secretAccessKey: backend.secretAccessKey
				}
			},
			extras: {
				operation: constants.operations.create
			}
		}
	};
	await queueService.sendMessage(config.queueName, message, { accountId, userId, path: constants.jobPaths.undecided }); // todo: Set a proper job path instead of job type
};
