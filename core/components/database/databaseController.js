const EnvironmentDatabaseServer = require('../../db/models/environment_application/databaseServer');
const EnvironmentModel = require('../../db/models/environment_application/environment');
const constants = require('../../utils/constants');
const tokenService = require('../../utils/auth/tokenService');
const { getEnvironmentIdAndProviderName } = require('./helpers');
const AWS = require('aws-sdk');
const awsApiVersions = require('../../utils/awsApiVersions');
const Provider = require('../../db/models/provider');

// declarations
exports.listEnvironmentDatabases = listEnvironmentDatabases;
exports.listEnvironmentDatabaseVersions = listEnvironmentDatabaseVersions;
exports.getEnvironmentDatabaseDetails = getEnvironmentDatabaseDetails;
exports.deleteDatabase = deleteDatabase;
exports.getDatabaseResources = getDatabaseResources;
exports.getDatabaseKind = getDatabaseKind;

//----------------------------
async function listEnvironmentDatabases(req, res) {
	const accountId = tokenService.getAccountIdFromToken(req);
	const environmentName = req.params.name; // This can be null as two routes are handled here
	let environmentIds = [];
	try {
		let result = await EnvironmentModel.listEnvironmentIdsByAccount(accountId, environmentName);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.duplicate) {
				res.sendStatus(constants.statusCodes.duplicate);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			environmentIds = result.output.environmentIds.map((e) => e.id);
			if (!environmentIds.length) {
				// User doesn't have any environments, so no need to search for the environment databases
				res.send([]);
				return;
			}
		}
	} catch (error) {
		console.error(`error:`, error.message);
		res.sendStatus(constants.statusCodes.ise);
	}

	console.log(`environmentIds`, environmentIds);

	try {
		let result = await EnvironmentDatabaseServer.listEnvironmentDatabases(environmentIds);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			res.send(result.output.databases);
		}
	} catch (e) {
		console.log(e.message);
		res.sendStatus(constants.statusCodes.ise);
	}
}
//----------------------------
async function listEnvironmentDatabaseVersions(req, res) {
	const accountId = tokenService.getAccountIdFromToken(req);
	const environmentName = req.params.environmentName;

	// Check if the environment exist and get it's id
	let environmentId;
	try {
		let result = await EnvironmentModel.getEnvironmentIdAndProvider(accountId, environmentName); // we don't use the provider here
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			environmentId = result.output.id;
		}
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
		return;
	}

	console.log(`environmentId`, environmentId);

	const databaseName = req.params.name;
	try {
		let result = await EnvironmentDatabaseServer.listEnvironmentVersions(environmentId, databaseName);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			res.send(result.output.databases);
		}
	} catch (e) {
		console.log(e.message);
		res.sendStatus(constants.statusCodes.ise);
	}
}
//----------------------------
async function getEnvironmentDatabaseDetails(req, res) {
	const accountId = tokenService.getAccountIdFromToken(req);
	const environmentName = req.params.environmentName;

	// Check if the environment exist and get it's id
	let environmentId;
	try {
		let result = await EnvironmentModel.getEnvironmentIdAndProvider(accountId, environmentName); // we don't use the provider here
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			environmentId = result.output.id;
		}
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
		return;
	}

	console.log(`environmentId`, environmentId);

	const databaseName = req.params.name;
	const version = req.params.version;
	try {
		let result = await EnvironmentDatabaseServer.getEnvironmentDatabaseDetails(environmentId, databaseName, version);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			res.send(result.output.database);
		}
	} catch (e) {
		console.log(e.message);
		res.sendStatus(constants.statusCodes.ise);
	}
}
//-----------------------------------------
async function deleteDatabase(req, res) {
	const environmentName = req.params.environmentName;
	const databaseName = req.params.databaseName;
	const accountId = tokenService.getAccountIdFromToken(req);
	const userId = tokenService.getUserIdFromToken(req);

	// Check if the environment exist and get it's id
	const result = await getEnvironmentIdAndProviderName(accountId, environmentName, res);
	if (!result) {
		return;
	}
	const { environmentId } = result;

	try {
		let result = await EnvironmentDatabaseServer.deleteDatabase(userId, environmentId, databaseName);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.notFound); // application not found
				return;
			} else if (result.message === 'Cannot delete the database, it needs to be destroyed first') {
				res.status(constants.statusCodes.badRequest).send('Cannot delete the database, it needs to be destroyed first');
				return;
			}
		} else {
			res.sendStatus(constants.statusCodes.ok);
		}
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
	}
}
//-----------------------------------------
// This method pulls the state file from s3 for the application and based on fields query extracts the root module outputs or entire state as the application resources.
// If the state file is not found for any reason it responds with BAD_REQUEST
async function getDatabaseResources(req, res) {
	const environmentName = req.params.environmentName;
	const databaseName = req.params.databaseName;
	const accountId = tokenService.getAccountIdFromToken(req);
	// Check if the environment belongs to the user
	const envProvider = await getEnvironmentIdAndProviderName(accountId, environmentName, res);
	if (!envProvider) {
		return;
	}

	let result = await Provider.getDetails(accountId, envProvider.providerDisplayName);
	console.log(result);
	if (!result.success) {
		if (result.message == constants.errorMessages.models.elementNotFound) {
			res.sendStatus(constants.statusCodes.notFound);
			return;
		} else {
			res.sendStatus(constants.statusCodes.ise);
			return;
		}
	}
	const { bucketName, region } = result.output.provider;
	let credentials;
	try {
		const result = await Provider.getAccountCredentials(accountId, envProvider.providerDisplayName);

		if (!result.success) {
			res.status(constants.statusCodes.badRequest).send();
			return;
		}
		credentials = result.output.credentials;
	} catch (error) {
		console.log(`error: `, error.message);
		res.sendStatus(constants.statusCodes.ise);
		return;
	}

	const baseConfig = {
		credentials,
		region
	};
	const s3 = getS3(baseConfig);
	try {
		const params = {
			Bucket: bucketName, //IMPORTANT: this object path should be kept in sync with inf-worker.
			Key: `utopiops-water/applications/environment/${environmentName}/database/${databaseName}`
		};
		const resp = await s3.getObject(params).promise();
		const state = JSON.parse(resp.Body.toString());
		console.log(JSON.stringify(state));

		const fields = req.query.fields; //Sending response based on fields query
		if (fields === '[*]') {
			res.json(state);
			return;
		}
		const root = state.modules.findIndex((m) => m.path.length === 1 && m.path[0] === 'root');
		res.json(state.modules[root].outputs);
	} catch (err) {
		console.log(`error: ${err.message} - ${err.code}`);
		if (err.code === 'NoSuchKey') {
			res.sendStatus(constants.statusCodes.badRequest);
			return;
		}
		res.sendStatus(constants.statusCodes.ise);
	}
}
//----------------------------
async function getDatabaseKind(req, res) {
	const accountId = tokenService.getAccountIdFromToken(req);
	const environmentName = req.params.environmentName;

	// Check if the environment exist and get it's id
	let environmentId;
	try {
		let result = await EnvironmentModel.getEnvironmentIdAndProvider(accountId, environmentName); // we don't use the provider here
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			environmentId = result.output.id;
		}
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
		return;
	}

	const databaseName = req.params.databaseName;
	try {
		let result = await EnvironmentDatabaseServer.getKind(environmentId, databaseName);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			res.send({ kind: result.output.kind });
		}
	} catch (e) {
		console.log(e.message);
		res.sendStatus(constants.statusCodes.ise);
	}
}

//---------------------------------------------------

function getS3(baseConfig) {
	updateConfig(baseConfig);
	return new AWS.S3({
		apiVersion: awsApiVersions.s3
	});
}

function updateConfig(baseConfig) {
	AWS.config.update({
		region: baseConfig.region,
		accessKeyId: baseConfig.credentials.accessKeyId,
		secretAccessKey: baseConfig.credentials.secretAccessKey
	});
}
