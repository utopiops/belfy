const EnvironmentDatabaseServer = require('../../db/models/environment_application/databaseServer');
const EnvironmentModel = require('../../db/models/environment_application/environment');
const constants = require('../../utils/constants');
const tokenService = require('../../utils/auth/tokenService');
const yup = require('yup');
const queueService = require('../../queue');
const logger = require('../../utils/logger');
const semver = require('semver');
const { getEnvironmentIdAndProviderName } = require('./helpers');
const { config } = require('../../utils/config');

// declarations;
exports.createOrUpdateRDS = createOrUpdateRDS;
exports.activateDatabase = activateDatabase;
exports.getActiveDatabaseDetails = getActiveDatabaseDetails;
exports.dryRunDatabase = dryRunDatabase;
exports.deployDatabase = deployDatabase;
exports.destroyDatabase = destroyDatabase;
exports.listDatabases = listDatabases;
exports.deleteDatabase = deleteDatabase;
exports.setDatabaseState = setDatabaseState;

// implementations;
async function createOrUpdateRDS(req, res, next) {
	//todo: add validation
	const accountId = tokenService.getAccountIdFromToken(req);
	const userId = tokenService.getUserIdFromToken(req);
	const environmentName = req.params.name;
	// We handle multiple endpoints with this controller, so here we try to find out which path it is
	const isFirstVersion = req.params.version == null;
	const isUpdate = req.method === 'PUT' ? true : false;
	let version = 0;
	if (!isFirstVersion) {
		version = req.params.version;
	}

	console.log(`isFirstVersion`, isFirstVersion);
	console.log(`isUpdate`, isUpdate);

	const validationSchema = yup.object().shape({
		dbsName: yup
			.string()
			.min(3, 'A minimum of 3 characters is required')
			.max(40, 'Maximum length is 40')
			.test('rds-name', 'Invalid RDS name', (value) => /^(?!.*--)[a-zA-Z]+[a-zA-Z0-9\-]*(?<!-)$/.test(value))
			.required(),
		allocated_storage: yup.number().required(),
		parameterGroupFamily: yup.string(),
		engineType: yup
			.string()
			.oneOf([
				'aurora',
				'aurora-mysql',
				'aurora-postgresql',
				'mariadb',
				'mysql',
				'oracle-ee',
				'oracle-se2',
				'oracle-se1',
				'oracle-se',
				'postgres',
				'sqlserver-ee',
				'sqlserver-se',
				'sqlserver-ex',
				'sqlserver-web'
			])
			.required(),
		engineVersion: yup
			.string()
			// todo: update this
			// .test("engine-version", "Invalid engine version", (value) =>
			//   /^\d+.\d+(.\d+)?$/.test(value)
			// )
			.required(),
		instanceClass: yup
			.string()
			.test('instance-class', 'Invalid instance class', function(value) {
				return testInstanceClass(value, this.parent.engineType, this.parent.engineVersion);
			})
			.required(),
		databaseName: yup.string().when('engineType', {
			is: (v) => v === 'sqlserver-ex',
			then: yup.string().notRequired(),
			otherwise: yup
				.string()
				.min(3, 'A minimum of 3 characters is required')
				.max(63, 'Maximum length is 63')
				.test('database-name', 'Invalid database name', (value) =>
					/^(?!.*--)[a-zA-Z]+[a-zA-Z0-9\-]*(?<!-)$/.test(value)
				)
				.required('Please fill out this field')
		}),
		databaseUser: yup
			.string() // todo: improve validation
			.required(),
		databasePassword: yup
			.string() // todo: improve validation
			.required(),
		databasePort: yup.number(), // todo: improve validation
		isMultiAz: yup.boolean(),
		storageType: yup.string().oneOf([ 'standard', 'gp2', 'io1' ]),
		iops: yup.number().when('storageType', {
			is: (v) => v === 'io1',
			then: yup.number().required()
		}),
		publiclyAccessible: yup.boolean(),
		allowMajorVersionUpgrade: yup.boolean(),
		autoMinorVersionUpgrade: yup.boolean(),
		applyImmediately: yup.boolean(),
		maintenanceWindow: yup.string(), // todo: improve validation to match ddd:hh24:mi-ddd:hh24:mi
		skipFinalSnapshot: yup.boolean(),
		copyTagsToSnapshot: yup.boolean(),
		backupRetentionPeriod: yup.number(),
		backupWindow: yup.string() // todo: improve validation to match hh24:mi-hh24:mi
	});
	try {
		validationSchema.validateSync(req.body);
	} catch (err) {
		res.status(constants.statusCodes.ue).send(err.message);
		return;
	}

	// Check if the environment exist and it's provider is aws and get it's id
	let environmentId, providerName;
	try {
		let result = await EnvironmentModel.getEnvironmentIdAndProvider(accountId, environmentName);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			environmentId = result.output.id;
			providerName = result.output.providerName;
			if (providerName !== constants.applicationProviders.aws) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
		}
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
		return;
	}

	try {
		let rds = {
			createdBy: userId,
			...req.body
		};
		console.log(`rds`, JSON.stringify(rds, null, 2));

		if (isUpdate) {
			rds.version = version;
		} else if (!isFirstVersion) {
			rds.fromVersion = version;
		}

		let result = isFirstVersion
			? await EnvironmentDatabaseServer.createRDS(environmentId, rds)
			: isUpdate
				? await EnvironmentDatabaseServer.updateRDS(environmentId, rds)
				: await EnvironmentDatabaseServer.addRDS(environmentId, rds);

		if (!result.success) {
			if (result.message == constants.errorMessages.models.duplicate) {
				res.sendStatus(constants.statusCodes.duplicate);
			} else if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
			} else {
				res.sendStatus(constants.statusCodes.ise);
			}
		} else {
			res.sendStatus(constants.statusCodes.ok);
		}
	} catch (e) {
		console.log(`error`, e.message);
		res.sendStatus(constants.statusCodes.ise);
		return;
	}
}

// validators;
function testInstanceClass(value, engineType, engineVersion) {
	if (!/^db\.[a-z][a-z1-9]{1,2}\..{5,8}$/.test(value)) {
		return false;
	}

	let engineTypeMapped = engineType.includes('postgres')
		? 'postgres'
		: engineType.includes('sqlserver')
			? 'sqlserver'
			: engineType.includes('mariadb')
				? 'mariadb'
				: engineType.includes('mysql')
					? 'mysql'
					: engineType.includes('aurora') ? 'mysql' : engineType.includes('oracle') ? 'oracle' : 'invalid';

	if ([ 'sqlserver', 'oracle' ].indexOf(engineTypeMapped) !== -1) {
		return true; // TODO: Update the validations for these two engine types
	}

	// See: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.html
	// # Supported DB engines for DB instance classes
	const validValues = {
		'db.m6g.(16xlarge|12xlarge|8xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '10.5.x', '>=10.4.13' ],
			sqlserver: [],
			mysql: [ '>=8.0.17' ],
			oracle: [],
			postgres: [ '12.3.x' ]
		},
		'db.m5.(24xlarge|12xlarge|8xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>0.x' ]
		},
		'db.m5.(16xlarge|8xlarge)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>=11.6', '>=10.11', '>=9.6.16', '>=9.5.20' ]
		},
		'db.m4.(16xlarge)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '8.0.x', '5.7.x', '5.6.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>0.x' ]
		},
		'db.m4.(10xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>0.x' ]
		},
		'db.m3.(2xlarge|xlarge|large)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [],
			postgres: [ '>0.x' ]
		},
		'db.m1.(xlarge|large|medium|small)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [],
			oracle: [],
			postgres: []
		},
		'db.z1d.(12xlarge|6xlarge|3xlarge|2xlarge|xlarge|large)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [],
			oracle: [ '>0.x' ],
			postgres: []
		},
		'db.x1e.(32xlarge|16xlarge|8xlarge|4xlarge|2xlarge|xlarge)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [],
			oracle: [ '>0.x' ],
			postgres: []
		},
		'db.x1.(32xlarge|16xlarge)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [],
			oracle: [ '>0.x' ],
			postgres: []
		},
		'db.r6g.(16xlarge|12xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '10.5.x', '>=10.4.13' ],
			sqlserver: [],
			mysql: [ '>=8.0.17' ],
			oracle: [],
			postgres: [ '12.13.x' ]
		},
		'db.r5b.(24xlarge|16xlarge|12xlarge|8xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [],
			oracle: [ '>0.x' ],
			postgres: []
		},
		'db.r5.(24xlarge|16xlarge|12xlarge|8xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>=11.6', '>=10.11', '>=9.6.16', '>=9.5.20' ]
		},
		'db.r4.(16xlarge|8xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '8.0.x', '5.7.x', '5.6.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>0.x' ]
		},
		'db.r3.(8xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [],
			postgres: [ '>0.x' ]
		},
		'db.m2.(4xlarge|2xlarge|xlarge)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [],
			oracle: [],
			postgres: []
		},
		'db.t3.(2xlarge|xlarge|large|medium|small|micro)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>0.x' ]
		},
		'db.t2.(2xlarge|xlarge)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '8.0.x', '5.7.x', '5.6.x' ],
			oracle: [],
			postgres: [ '9.6.x', '9.5.x' ]
		},
		'db.t2.(large|medium|small|micro)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [],
			postgres: [ '>0.x' ]
		}
	};

	let found = false;
	let allowed = [];
	Object.keys(validValues).findIndex((k) => {
		const r = new RegExp(`^${k}\$`);
		if (r.test(value)) {
			allowed = validValues[k][engineTypeMapped];
			found = true;
		}
	});
	if (!found) {
		return false;
	}
	if (!allowed.length) {
		return false;
	}
	return /^\d+.\d+$/.test(engineVersion)
		? semver.satisfies(`${engineVersion}.0`, allowed.join('||'))
		: semver.satisfies(engineVersion, allowed.join('||'));
}
// -----------------------------------------
async function activateDatabase(req, res, next) {
	const environmentName = req.params.name;
	const dbsName = req.params.dbsName;
	const accountId = tokenService.getAccountIdFromToken(req);
	const userId = tokenService.getUserIdFromToken(req);
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

	const validationSchema = yup.object().shape({
		version: yup.number().required()
	});
	try {
		validationSchema.validateSync(req.body);
	} catch (err) {
		res.status(constants.statusCodes.ue).send(err.message);
		return;
	}

	const version = req.body.version;

	try {
		let result = await EnvironmentDatabaseServer.activate(userId, environmentId, dbsName, Number(version));
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.notFound); // application not found
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
// -----------------------------------------
async function getActiveDatabaseDetails(req, res, next) {
	const accountId = tokenService.getAccountIdFromToken(req);
	const environmentName = req.params.name;
	const dbsName = req.params.dbsName;
	const version = req.query.version;

	// Check if the environment exist and get its id
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

	try {
		let result = await EnvironmentDatabaseServer.getForTf(environmentId, dbsName, version);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		} else {
			res.send(result.output.db);
		}
	} catch (e) {
		console.log(e.message);
		res.sendStatus(constants.statusCodes.ise);
	}
}

// -----------------------------------------
// This controller sends a message to the IW to dry-run an application
// IW must update the job status directly
async function dryRunDatabase(req, res) {
	await tfActionDatabase('dryRun', req, res);
}
async function deployDatabase(req, res) {
	await tfActionDatabase('deploy', req, res);
}
async function destroyDatabase(req, res) {
	await tfActionDatabase('destroy', req, res);
}

async function tfActionDatabase(action, req, res) {
	const accountId = tokenService.getAccountIdFromToken(req);
	const userId = tokenService.getUserIdFromToken(req);
	const environmentName = req.params.name;
	const dbsName = req.params.dbsName;
	const validationSchema = yup.object().shape({
		accessKeyId: yup.string(),
		secretAccessKey: yup.string(),
		version: yup.number(),
		variables: yup.object()
	});
	try {
		validationSchema.validateSync(req.body);
	} catch (err) {
		res.status(constants.statusCodes.ue).send(err.message);
		return;
	}

	const { accessKeyId, secretAccessKey, variables, version } = req.body;

	const environmentId = res.locals.environmentId;
	let databaseKind = '',
		activeVersion;
	try {
		const databaseKindResult = await EnvironmentDatabaseServer.getKind(environmentId, dbsName);
		if (!databaseKindResult.success) {
			if (databaseKindResult.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
				return;
			}
			res.sendStatus(constants.statusCodes.ise);
			return;
		}
		databaseKind = databaseKindResult.output.kind;
		activeVersion = databaseKindResult.output.activeVersion;
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
		return;
	}

	const jobPaths = {
		dryRun: {
			[constants.databaseServerKinds.rds]: constants.jobPaths.dryRunDatabaseRdsV2
		},
		deploy: {
			[constants.databaseServerKinds.rds]: constants.jobPaths.deployDatabaseRdsV2
		},
		destroy: {
			[constants.databaseServerKinds.rds]: constants.jobPaths.destroyDatabaseRdsV2
		}
	};

	const jobPath = jobPaths[action][databaseKind];
	if (!jobPath) {
		console.error('invalid database server kind');
		res.sendStatus(constants.statusCodes.ise);
		return;
	}

	const databaseVersion = version ? version : activeVersion;

	const message = {
		jobPath,
		jobDetails: {
			userId,
			accountId,
			details: {
				environmentName,
				dbsName,
				variables,
				version: databaseVersion,
				provider: res.locals.provider,
				credentials: {
					accessKeyId: accessKeyId || res.locals.credentials.accessKeyId,
					secretAccessKey: secretAccessKey || res.locals.credentials.secretAccessKey
				}
			}
		}
	};
	const options = {
		userId: message.jobDetails.userId,
		accountId: message.jobDetails.accountId,
		path: message.jobPath,
		jobDataBag: {
			environmentName,
			dbsName,
			variables,
			version: databaseVersion
		}
	};
	try {
		const jobId = await queueService.sendMessage(config.queueName, message, options);
		if (action === 'deploy' || action === 'destroy') {
			const state = {
				code: action === 'deploy' ? 'deploying' : 'destroying',
				job: jobId
			};
			await EnvironmentDatabaseServer.setState(environmentId, dbsName, state);
		}
		res.send(jobId);
	} catch (error) {
		console.log(`error: ${error.message}`);
		res.status(constants.statusCodes.ise).send('Failed to schedule the job!');
	}
}
// -----------------------------------------
async function listDatabases(req, res, next) {
	const accountId = tokenService.getAccountIdFromToken(req);
	const environmentName = req.params.name;

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

	try {
		let result = await EnvironmentDatabaseServer.listSummaryByEnvId(environmentId);
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
// -----------------------------------------
async function deleteDatabase(req, res, next) {
	const environmentName = req.params.name;
	const databaseName = req.params.dbsName;
	const accountId = tokenService.getAccountIdFromToken(req);
	const userId = tokenService.getUserIdFromToken(req);

	// Check if the environment exist and get its id
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
			} else if (result.message === 'Cannot delete the environment, it needs to be destroyed first') {
				res
					.status(constants.statusCodes.badRequest)
					.send('Cannot delete the environment, it needs to be destroyed first');
			}
		} else {
			res.sendStatus(constants.statusCodes.ok);
		}
	} catch (error) {
		console.error(error.message);
		res.sendStatus(constants.statusCodes.ise);
	}
}
// -----------------------------------------
async function setDatabaseState(req, res) {
	const environmentName = req.params.name;
	const databaseName = req.params.dbsName;
	const accountId = tokenService.getAccountIdFromToken(req);

	// Check if the environment exist and get its id
	const result = await getEnvironmentIdAndProviderName(accountId, environmentName, res);
	if (!result) {
		return;
	}
	const { environmentId } = result;

	const validationSchema = yup.object().shape({
		code: yup.string().oneOf([ 'deployed', 'deploy_failed', 'destroyed', 'destroy_failed' ]).required(),
		job: yup.string().required()
	});
	try {
		validationSchema.validateSync(req.body);
	} catch (err) {
		res.status(constants.statusCodes.ue).send(err.message);
		return;
	}

	const state = req.body;
	try {
		let result = await EnvironmentDatabaseServer.setState(environmentId, databaseName, state);
		if (!result.success) {
			if (result.message == constants.errorMessages.models.elementNotFound) {
				res.sendStatus(constants.statusCodes.badRequest);
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
