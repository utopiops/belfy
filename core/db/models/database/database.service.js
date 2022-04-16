const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const DatabaseServerModel = require('./databaseServer');
const EnvironmentModel = require('../environment/environment')
const constants = require('../../../utils/constants');
const { runQueryHelper } = require('../helpers');
const DatabaseVersion = require('./databaseVersion');
const RDS = require('./rdsV2');
const timeService = require('../../../services/time.service');
const { config } = require('../../../utils/config');
const queueService = require('../../../queue');
const AWS = require('aws-sdk');
const awsApiVersions = require('../../../utils/awsApiVersions');
const HttpConfig = require('../../../utils/http/http-config');
const Job = require('../job')
const job = new Job()

module.exports = {
	createRDS,
	addRDS,
	updateRDS,
	listEnvironmentDatabases,
	listEnvironmentDatabaseVersions,
	getEnvironmentDatabaseDetails,
  getDatabaseSummary,
	listAccountDatabases,
	getKind,
	activate,
	tfActionDatabase,
	getForTf,
	setState,
	deleteDatabase,
  getDatabaseResources
};
//---------------------------------------------------------
async function createRDS(environmentId, databaseVersion) {
	let step = 0;
	let rdsId;
	try {
		const newRDS = {
			environment: environmentId,
			name: databaseVersion.name,
			kind: constants.databaseServerKinds.rds
		};
		const dbs = new DatabaseServerModel(newRDS);
		await dbs.save();
		step++;

		databaseVersion.environmentDatabase = dbs._id;

		const doc = new RDS(databaseVersion);
		await doc.save();
		step++;

		rdsId = doc._id;

		const filter = { _id: dbs._id };
		const update = {
			$push: {
				versions: rdsId
			}
		};
		const updated = DatabaseServerModel.findOneAndUpdate(filter, update, { new: true }).exec();
		if (updated == null) {
			throw new Error('Failed to update');
		}
		return {
			success: true,
      outputs: { version: doc.version }
		};
	} catch (err) {
		console.error(`error: `, err.message, '  rolling back');
		try {
			if (step > 1) {
				// rollback the second part (database version insert)
				await RDS.findOneAndDelete({ _id: rdsId }).exec();
			}
			if (step > 0) {
				// rollback the first part (database insert)
				await DatabaseServerModel.findOneAndDelete({
					environment: environmentId,
					name: databaseVersion.name
				}).exec();
			}
		} catch (e) {
			// TODO: do something about it. if we go inside this, we'll have data inconsistency
			console.error(`failed to rollback adding the database ${databaseVersion.name}`);
			let message = err.message;
			return {
				success: false,
				message: message
			};
		}
		let message = err.message;
		if (err.code && err.code === 11000) {
			message = constants.errorMessages.models.duplicate;
		}
		return {
			success: false,
			message: message
		};
	}
}
//---------------------------------------------------------
async function addRDS(environmentId, databaseVersion) {
	let step = 0;
	let dbId;
	try {
		// Check if the environment database exists (get it's _id)
		const filter = {
			environment: environmentId,
			name: databaseVersion.name
		};
		const db = await DatabaseServerModel.findOne(filter, { _id: 1 }).exec();
		if (db == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		// Check if an database-version with the specified version exists for this environment database
		const dbVersionFilter = {
			environmentDatabase: db._id,
			version: databaseVersion.fromVersion
		};
		const appVer = await DatabaseVersion.findOne(dbVersionFilter, { _id: 1 }).exec();
		if (appVer == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		// Find the biggest version for this environment database
		const maxFilter = {
			environmentDatabase: db._id
		};
		const max = await DatabaseVersion.findOne(maxFilter, { version: 1 }).sort('-version').exec();
		if (max == null) {
			return {
				success: false
			};
		}

		// Increase the version by 1 and add the new database version
		databaseVersion.environmentDatabase = db._id;
		databaseVersion.version = max.version + 1;

		const doc = new RDS(databaseVersion);
		await doc.save();
		step++;

		dbId = doc._id;

		// Push the version to the environment database versions
		const update = {
			$push: {
				versions: dbId
			}
		};
		const updated = DatabaseServerModel.findOneAndUpdate({ _id: db._id }, update, { new: true }).exec();
		if (updated == null) {
			throw new Error('Failed to update');
		}
		return {
			success: true,
      outputs: { version: doc.version }
		};
	} catch (err) {
		console.error(`error: `, err.message);
		try {
			if (step > 1) {
				// rollback the database version insert
				await RDS.findOneAndDelete({ _id: dbId }).exec();
			}
		} catch (e) {
			let message = err.message;
			return {
				success: false,
				message: message
			};
		}
		let message = err.message;
		if (err.code && err.code === 11000) {
			message = constants.errorMessages.models.duplicate; // This might happen if two people add new version at the very same time and the new version becomes equal for both!!!
		}
		return {
			success: false,
			message: message
		};
	}
}
//---------------------------------------------------------
async function updateRDS(environmentId, databaseVersion) {
	const runQuery = async () => {
		const filter = {
			environment: environmentId,
			name: databaseVersion.name
		};
		const db = await DatabaseServerModel.findOne(filter, { _id: 1 }).exec();

		if (!db) return;

		// If an database-version with the specified version which has never been activated exists for this environment database update it
		const dbVersionFilter = {
			environmentDatabase: db._id,
			version: databaseVersion.version,
			isActivated: false
		};

		return await RDS.findOneAndUpdate(dbVersionFilter, databaseVersion, { new: true }).exec();
	};

  const extractOutput = (outputs) => {
    return {
      version: outputs.version
    }
  }

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function listEnvironmentDatabases(environmentId) {
	const runQuery = async () => {
		const filter = { environment: { $in: environmentId } };
		return await DatabaseServerModel.find(filter, { name: 1, kind: 1, activeVersion: 1, state: 1 })
			.populate('environment', 'name')
			.exec();
	};
	const extractOutput = (result) => [
		...result.map((db) => ({
			id: db._id,
			state: db.state,
			name: db.name,
			kind: db.kind,
			activeVersion: db.activeVersion,
			environmentName: db.environment.name
		}))
	];
	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function listEnvironmentDatabaseVersions(environmentId, databaseName) {
	const runQuery = async () => {
		const filter = { environment: environmentId, name: databaseName };
		return await DatabaseServerModel.findOne(filter, { _id: 1 })
			.populate('versions', 'version fromVersion createdAt isActivated engine')
			.exec();
	};

	const extractOutput = (result) => [
		...result.versions.map((db) => ({
			version: db.version,
			fromVersion: db.fromVersion,
			kind: db.kind,
			createdAt: db.createdAt,
			isActivated: db.isActivated,
			engine: db.engine
		}))
	];

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function getEnvironmentDatabaseDetails(environmentId, databaseName, version) {
	const runQuery = async () => {
		const filter = { environment: environmentId, name: databaseName };
		const doc = await DatabaseServerModel.aggregate([
			{
				$match: filter
			},
			{
				$lookup: {
					from: 'database_version_v2',
					localField: 'versions',
					foreignField: '_id',
					as: 'version'
				}
			},
			{
				$addFields: {
					totalVersions: { $size: '$version' },
				}
			},
			{
				$unwind: "$version"
			},
			{
				$match: {
					"version.version": Number(version)
				}
			},
			{
				$project: {
					name: 1,
					'state.code': 1,
					version: 1,
					totalVersions: 1
				},
			}
		]);

		const database = doc[0];

		if (database == null || database.version == null) {
			return;
		}

    delete database.version._id;
    delete database.version.__v;
		return {
			...database.version,
			name: database.name,
			state: database.state,
			totalVersions: database.totalVersions
		};
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function listAccountDatabases(accountId) {
	const runQuery = async () => {
		return await DatabaseServerModel.aggregate([
			{
				$lookup: {
					from: 'environment_v2',
					localField: 'environment',
					foreignField: '_id',
					as: 'db_with_env'
				}
			},
			{
				$lookup: {
					from: 'database_version_v2',
					localField: 'versions',
					foreignField: '_id',
					as: 'db_with_versions'
				}
			},
			{
				$match: {
					'db_with_env.accountId': ObjectId(accountId)
				}
			},
			{
				$unwind: '$db_with_env'
			},
			{
				$project: {
					id: 1,
					state: 1,
					name: 1,
					kind: 1,
					versions: '$db_with_versions',
					activeVersion: 1,
					deployedVersion: 1,
					environmentName: '$db_with_env.name',
				}
			}
		]);
	};
	const extractOutput = (result) => [
		...result.map((db) => {
			return {
				id: db._id,
				state: db.state,
				name: db.name,
				kind: db.kind,
				engine: db.versions[(db.deployedVersion || db.activeVersion || db.versions.length) - 1].engine,
				activeVersion: db.activeVersion,
				deployedVersion: db.deployedVersion,
				environmentName: db.environmentName
			}
		})
	];
	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function getKind(environmentId, databaseName) {
	const runQuery = async () => {
		const filter = { environment: environmentId, name: databaseName };
		return await DatabaseServerModel.findOne(filter, { kind: 1, activeVersion: 1 }).exec();
	};

	const extractOutput = (result) => ({
		kind: result.kind,
		activeVersion: result.activeVersion
	});

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function activate(userId, environmentId, dbsName, version) {
	const runQuery = async () => {
		const filter = { environment: new ObjectId(environmentId), name: dbsName, activeVersion: { $ne: version } };
		const doc = await DatabaseServerModel.findOne(filter).populate('versions', 'version').exec();

		if (doc == null || !doc.populated('versions')) {
			throw new Error(constants.errorMessages.models.elementNotFound);
		}

		const exists = doc.versions.findIndex((v) => v.version === version) !== -1;
		if (!exists) {
			throw new Error(constants.errorMessages.models.elementNotFound);
		}

		// Now that it exists, update it
		const update = {
			activeVersion: version,
			activatedAt: timeService.now(),
			activatedBy: userId
		};
		const updated = await DatabaseServerModel.findByIdAndUpdate(doc._id, update, { new: true }).exec();
		if (!updated) {
			throw new Error('Failed to update environment database');
		}
		// Update the status of the database version
		const dbvFilter = { environmentDatabase: doc._id, version };
		const dbvUpdate = { isActivated: true };
		const updateDatabaseVersion = await DatabaseVersion.findOneAndUpdate(dbvFilter, dbvUpdate, { new: true }).exec();
		if (updateDatabaseVersion == null) {
			throw new Error('Failed to update environment database');
		}
		return updateDatabaseVersion;
	};

	return await runQueryHelper(runQuery);
}
//-----------------------------
async function tfActionDatabase(action, req, res) {
	const { accountId, userId, environmentId } = res.locals;
	const { environmentName, databaseName } = req.params;
	const { accessKeyId, secretAccessKey, variables, version} = req.body;	

  if(action == 'deploy') {
    const environment = await EnvironmentModel.findOne({ _id: environmentId, 'state.code': 'deployed' })
    if(!environment) {
      return {
        error: {
          statusCode: constants.statusCodes.notAllowed,
          message: 'The intended environment must be deployed to be able to deploy the database'
        }
      }
    }
  }

	let databaseKind = '',
		activeVersion;

	const databaseKindResult = await getKind(environmentId, databaseName);
	if (!databaseKindResult.success) {
		return {
			success: false
		}
	}
	databaseKind = databaseKindResult.outputs.kind;
	activeVersion = databaseKindResult.outputs.activeVersion;

	const jobPaths = {
		dryRun: {
			[constants.databaseServerKinds.rds]: constants.jobPaths.dryRunDatabaseRdsV4
		},
		deploy: {
			[constants.databaseServerKinds.rds]: constants.jobPaths.deployDatabaseRdsV4
		},
		destroy: {
			[constants.databaseServerKinds.rds]: constants.jobPaths.destroyDatabaseRdsV4
		}
	};

	const jobPath = jobPaths[action][databaseKind];
	if (!jobPath) {
		console.error('invalid database server kind');
		return {
			success: false,
			error: {
				message: 'invalid database server kind',
				statusCode: constants.statusCodes.badRequest
			}
		}
	}

	const dbServer = await DatabaseServerModel.findOne({ environment: environmentId, name: databaseName }, {_id: 0, __v: 0, versions: 0});
	if(!dbServer) {
		return {
			success: false,
			error: {
				message: constants.errorMessages.models.elementNotFound,
				statusCode: constants.statusCodes.badRequest
			}
		}
	}

	// If the action is deploy or destroy, ignore the version and just use activeVersion and deployedVersion
	// If the action is dry-run, use the version sent by user, if not provided just use the activeVersion
	const databaseVersion = (action === 'destroy') ? dbServer.deployedVersion : ( action === 'deploy'|| !version ) ? activeVersion : version;
	const dbVersion = await getForTf(environmentId, databaseName, databaseVersion);

	if(!dbVersion.success) {
		return {
			success: false,
			error: {
				message: constants.errorMessages.models.elementNotFound,
				statusCode: constants.statusCodes.badRequest
			}
		}
	}

  console.log(JSON.stringify(dbVersion.outputs, null, 2))

	const message = {
		jobPath,
		jobDetails: {
			userId,
			accountId,
			details: {
				environmentName,
        runtimeVariables: variables,
				providerDetails: res.locals.provider.backend,
				credentials: {
					accessKeyId: accessKeyId || res.locals.credentials.accessKeyId,
					secretAccessKey: secretAccessKey || res.locals.credentials.secretAccessKey
				},
				...dbServer.toObject(),
				...dbVersion.outputs
			}
		}
	};
	const options = {
		userId: message.jobDetails.userId,
		accountId: message.jobDetails.accountId,
		path: message.jobPath,
		jobDataBag: {
			environmentName,
			dbsName: databaseName,
			variables,
			version: action === 'destroy' ? dbServer.deployedVersion : databaseVersion
		}
	};
	try {
		if (action === 'deploy' || action === 'destroy') {
			// First we try to set the state code only to see if we can send the job or not
			const stateCode = {
				code: action === 'deploy' ? 'deploying' : 'destroying'
			};
			const setStateCodeResult = await setState(environmentId, databaseName, stateCode);

			if (!setStateCodeResult.success) {
				throw new Error(constants.errorMessages.models.elementNotFound);
			}
		}
		const jobId = await queueService.sendMessage(config.queueName, message, options);
		if(action === 'deploy') {
			await DatabaseServerModel.findOneAndUpdate({ environment: environmentId, name: databaseName }, {deployedVersion: databaseVersion});
		}
		await setJobId(environmentId, databaseName, jobId);

    const jobNotification = {
      accountId: message.jobDetails.accountId,
      category: "infw",
      dataBag: {
        jobPath: message.jobPath,
        environmentName,
        dbsName: databaseName,
        status: 'created',
        jobId
      }
    }
	const httpConfig = new HttpConfig().withCustomHeaders(res.locals.headers);
    await job.sendJobNotification(jobNotification, httpConfig.config)

		return {
			success: true,
      outputs: { jobId }
		};
	} catch (error) {
		console.log(`error: ${error.message}`);
		return {
			success: false
		}
	}
}
//-----------------------------
async function getForTf(environmentId, dbsName, version = null) {
	const runQuery = async () => {
		let dbFilter = { environment: environmentId, name: dbsName };
		if (!version) {
			// If the version is not specified we find the active version of the application
			dbFilter.activeVersion = { $exists: true };
		}
		const doc = await DatabaseServerModel.findOne(dbFilter, { activeVersion: 1, state: 1, kind: 1 })
			.populate('environment', 'region hostedZone domain')
			.exec();

		if (doc == null) throw new Error(constants.errorMessages.models.elementNotFound);

		const filter = { environmentDatabase: doc._id, version: version ? version : doc.activeVersion };
		let db;
		switch (doc.kind) {
			case constants.databaseServerKinds.rds:
				db = await RDS.findOne(filter, {_id: 0, __v: 0}).exec();
		}
		if (db == null) throw new Error(constants.errorMessages.models.elementNotFound);

		let result = db.toJSON();
		result.region = doc.environment.region;
		result.hostedZone = doc.environment.hostedZone;
		result.domain = doc.environment.domain;
    result.activeVersion = doc.activeVersion;
    result.state = doc.state;
		return result;
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//-----------------------------
async function setState(environmentId, databaseName, state) {
	const runQuery = async () => {
		const stateCode = state.code;
		let validCurrentState = [];
		switch (stateCode) {
			case 'destroyed':
			case 'destroy_failed':
				validCurrentState = [ 'destroying' ];
				break;
			case 'deployed':
			case 'deploy_failed':
				validCurrentState = [ 'deploying' ];
				break;
			case 'destroying':
				validCurrentState = [ null, 'deployed', 'destroy_failed', 'deploy_failed' ];
				break;
			case 'deploying':
				validCurrentState = [ null, 'created', 'destroyed', 'destroy_failed', 'deploy_failed', 'deployed' ];
				break;
		}
		const filter = {
			// Note: at the moment I don't match the job in the state, not sure if it makes sense to verify the same job responsible for current state is updating it
			environment: environmentId,
			name: databaseName,
			'state.code': { $in: validCurrentState }
		};
		return await DatabaseServerModel.findOneAndUpdate(filter, { state }, { new: true }).exec();
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
// --------------------------------------
async function setJobId(environmentId, databaseName, jobId) {
  const filter = { 
    environment: environmentId,
    name: databaseName,
  };
  const update = {
    $set: {"state.job": jobId }
  }
  return await DatabaseServerModel.findOneAndUpdate(filter, update, { new: true }).exec();
}
//-----------------------------
async function deleteDatabase(userId, environmentId, databaseName) {
	const runQuery = async () => {
		// Check if such version for such application exists
		const filter = { environment: new ObjectId(environmentId), name: databaseName };
		const doc = await DatabaseServerModel.findOne(filter).exec();

		if (doc == null) {
			throw new Error(constants.errorMessages.models.elementNotFound);
		}
		// TODO: This is just the basic condition for now, has to be refined later as we use the database and figure out the common usage patterns
		let canDelete = false;
		if (doc.state.code === 'destroyed' || doc.state.code === 'created' || !doc.activeVersion) {
			canDelete = true;
		}
		if (!canDelete) {
			throw new Error('Cannot delete the environment, it needs to be destroyed first');
		}
		const dbVersionFilter = { environmentDatabase: doc._id };
		await DatabaseVersion.deleteMany(dbVersionFilter).exec();
		await DatabaseServerModel.findByIdAndDelete(doc._id).exec();
		return {
			success: true
		};
	};

	const extractOutput = (result) => result;

	return await runQueryHelper(runQuery, extractOutput);
}
//---------------------------------------------
async function getDatabaseSummary(environmentId, databaseName) {
  const runQuery = async () => {
    const filter = { environment: environmentId, name: databaseName };
    return await DatabaseServerModel.findOne(filter, {
      _id: 0,
      kind: 1,
      state: 1,
      deployedVersion: 1,
      activeVersion: 1,
    })
      .populate('versions', 'engine')
      .exec();
  };

  const extractOutput = (result) => ({
	  state: result.state,
	  kind: result.kind,
	  activeVersion: result.activeVersion,
	  deployedVersion: result.deployedVersion,
	  engine: result.versions[(result.deployedVersion || result.activeVersion || result.versions.length) - 1].engine,
  });

  return await runQueryHelper(runQuery, extractOutput);
}
//---------------------------------------------

async function getDatabaseResources(environmentName, databaseName, credentials, region, bucketName, fields) {
  AWS.config.update({
		region,
		accessKeyId: credentials.accessKeyId,
		secretAccessKey: credentials.secretAccessKey
	});
	const s3 = new AWS.S3({
		apiVersion: awsApiVersions.s3
	});

  try {
    const params = {
      Bucket: bucketName, //IMPORTANT: this object path should be kept in sync with inf-worker.
      Key: `utopiops-water/applications/environment/${environmentName}/database/${databaseName}`
    };
    const resp = await s3.getObject(params).promise();
    const state = JSON.parse(resp.Body.toString());
    console.log(JSON.stringify(state));
  
    if (fields === '[*]') { //Sending response based on fields query
      return {
        success: true,
        outputs: state
      };
    }
	if (fields == '[db_instance_endpoint]') {
		//Sending response based on fields query
		return {
		  success: true,
		  outputs: state.outputs.db_instance_endpoint.value,
		};
	}
    return {
      success: true,
      outputs: state.outputs
    };
  } catch (err) {
    console.log(`error: ${err.message} - ${err.code}`);
		if (err.code === 'NoSuchKey') {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: false
		};
  }
}