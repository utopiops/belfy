const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Schema = mongoose.Schema;
const timeService = require('../../../services/time.service');
const constants = require('../../../utils/constants');
const RDS = require('./rds');
const DatabaseVersion = require('./databaseVersion');

const modelName = 'env_database_server';

const environmentDatabaseServerSchema = new Schema(
	{
		environment: {
			type: ObjectId,
			ref: 'environment',
			required: true
		},
		name: {
			type: String,
			required: true
		},
		kind: String, // This field is repeated in the databaseVersion schema! is it the best way?!!
		activeVersion: Number,
		versions: {
			type: [
				{
					type: ObjectId,
					ref: 'database_version'
				}
			],
			default: []
		},
		deployedAt: {
			type: Number,
			default: timeService.now
		},
		deployedBy: {
			type: ObjectId,
			ref: 'User'
		},
		activatedAt: {
			type: Number
		},
		activatedBy: {
			type: ObjectId,
			ref: 'User'
		},
		/*
  created: the database is created for the first time (only once in the database's lifetime)
  deploying: for the database in created state, deploy action puts it in deploying state
  deployed: a successful deploy action moves the database from deploying state to deployed state
  deploy_failed: an unsuccessful deploy action moves the database from deploying state to failed state
  destroying: for the database in created state, destroy action puts it in destroying state
  destroyed: a successful destroy action moves the database from destroying state to destroyed state
  destroy_failed: an unsuccessful destroy action moves the database from destroying state to failed state
  */
		state: {
			type: {
				_id: false,
				code: {
					code: String
				},
				job: String
			},
			default: {
				code: 'created' // We don't provide reason for the state code ⏩created⏪
			}
		},
		lock: {
			//todo: remove if not used, here and for applications
			type: {
				_id: false,
				isLocked: Boolean, // set the other values only if this is true
				lockedAt: Date,
				id: String
			},
			default: {
				isLocked: false
			}
		}
	},
	{ toJSON: { virtuals: true } }
);

// indices
environmentDatabaseServerSchema.index({ environment: 1, name: 1 }, { unique: true });
environmentDatabaseServerSchema.virtual('job', {
	ref: 'Job',
	localField: 'state.job',
	foreignField: 'jobId',
	select: 'jobId',
	justOne: true
});

// Creates an ecs application
environmentDatabaseServerSchema.statics.createRDS = createRDS;
environmentDatabaseServerSchema.statics.addRDS = addRDS;
environmentDatabaseServerSchema.statics.updateRDS = updateRDS;
environmentDatabaseServerSchema.statics.activate = activate;
environmentDatabaseServerSchema.statics.getForTf = getForTf;
environmentDatabaseServerSchema.statics.getKind = getKind;
environmentDatabaseServerSchema.statics.listSummaryByEnvId = listSummaryByEnvId;
environmentDatabaseServerSchema.statics.listEnvironmentDatabases = listEnvironmentDatabases;
environmentDatabaseServerSchema.statics.listEnvironmentVersions = listEnvironmentVersions;
environmentDatabaseServerSchema.statics.getEnvironmentDatabaseDetails = getEnvironmentDatabaseDetails;
environmentDatabaseServerSchema.statics.deleteDatabase = deleteDatabase;
environmentDatabaseServerSchema.statics.setState = setState;

//---------------------------------------------------------
async function createRDS(environmentId, databaseVersion) {
	let step = 0;
	let rdsId;
	try {
		const newRDS = {
			environment: environmentId,
			name: databaseVersion.dbsName,
			kind: constants.databaseServerKinds.rds
		};
		const dbs = new this(newRDS);
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
		const updated = this.findOneAndUpdate(filter, update, { new: true }).exec();
		if (updated == null) {
			throw new Error('Failed to update');
		}
		return {
			success: true
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
				await this.findOneAndDelete({ environment: environmentId, name: databaseVersion.dbsName }).exec();
			}
		} catch (e) {
			// TODO: do something about it. if we go inside this, we'll have data inconsistency
			console.error(`failed to rollback adding the database ${databaseVersion.dbsName}`);
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
			name: databaseVersion.dbsName
		};
		const db = await this.findOne(filter, { _id: 1 }).exec();
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
		const updated = this.findOneAndUpdate({ _id: db._id }, update, { new: true }).exec();
		if (updated == null) {
			throw new Error('Failed to update');
		}
		return {
			success: true
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
	try {
		// Check if the environment database exists (get its _id)
		const filter = {
			environment: environmentId,
			name: databaseVersion.dbsName
		};
		const db = await this.findOne(filter, { _id: 1 }).exec();

		if (db == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		// If an database-version with the specified version which has never been activated exists for this environment database update it
		const dbVersionFilter = {
			environmentDatabase: db._id,
			version: databaseVersion.version,
			isActivated: false
		};

		const doc = await RDS.findOneAndUpdate(dbVersionFilter, databaseVersion, { new: true }).exec();
		if (doc == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: true
		};
	} catch (err) {
		console.error(`error: `, err.message);
		let message = err.message;
		return {
			success: false,
			message: message
		};
	}
}
//---------------------------------------------------------------
async function activate(userId, environmentId, dbsName, version) {
	try {
		// Check if such version for such application exists
		const filter = { environment: new ObjectId(environmentId), name: dbsName, activeVersion: { $ne: version } };
		const doc = await this.findOne(filter).populate('versions', 'version').exec();
		if (doc == null || !doc.populated('versions')) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		const exists = doc.versions.findIndex((v) => v.version === version) !== -1;
		if (!exists) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}

		// Now that it exists, update it
		const update = {
			activeVersion: version,
			activatedAt: timeService.now(),
			activatedBy: userId
		};
		const updated = await this.findByIdAndUpdate(doc._id, update, { new: true }).exec();
		if (updated == null) {
			return {
				success: false,
				message: 'Failed to update environment database'
			};
		}

		// Update the status of the database version
		const dbvFilter = { environmentDatabase: doc._id, version };
		const dbvUpdate = { isActivated: true };
		const updateDatabaseVersion = await DatabaseVersion.findOneAndUpdate(dbvFilter, dbvUpdate, { new: true }).exec();
		if (updateDatabaseVersion == null) {
			return {
				success: false,
				message: 'Failed to update database version status'
			};
		}
		return {
			success: true
		};
	} catch (err) {
		console.log(`error`, err);
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

async function getForTf(environmentId, dbsName, version = null) {
	try {
		let dbFilter = { environment: environmentId, name: dbsName };
		if (!version) {
			// If the version is not specified we find the active version of the application
			dbFilter.activeVersion = { $exists: true };
		}
		const doc = await this.findOne(dbFilter, { activeVersion: 1, kind: 1 })
			.populate('environment', 'region hostedZone')
			.exec();
		if (doc == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		const filter = { environmentDatabase: doc._id, version: version ? version : doc.activeVersion };
		let db;
		switch (doc.kind) {
			case constants.databaseServerKinds.rds:
				db = await RDS.findOne(filter).exec();
		}
		if (db == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		let result = db.toJSON();
		result.region = doc.environment.region;
		result.hostedZone = doc.environment.hostedZone;
		return {
			success: true,
			output: {
				db: result
			}
		};
	} catch (err) {
		console.log(`error`, err);
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

async function getKind(environmentId, dbsName) {
	try {
		const filter = { environment: environmentId, name: dbsName };
		const doc = await this.findOne(filter, { kind: 1 }).exec();
		if (doc == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: true,
			output: {
				kind: doc.kind,
				activeVersion: doc.activeVersion
			}
		};
	} catch (err) {
		console.log(`error`, err);
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

async function listSummaryByEnvId(environmentId) {
	try {
		const filter = { environment: environmentId };
		const databases = await this.find(filter, { name: 1, kind: 1, activeVersion: 1 }).exec();
		if (databases == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: true,
			output: {
				databases
			}
		};
	} catch (err) {
		console.log(`error`, err);
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

async function listEnvironmentDatabases(environmentIds) {
	try {
		const filter = { environment: { $in: environmentIds } };
		const databases = await this.find(filter, { name: 1, kind: 1, activeVersion: 1, state: 1 })
			.populate('environment', 'name')
			.exec();
		if (databases == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		let dbList = databases.map((db) => ({
			id: db._id,
			state: db.state,
			name: db.name,
			kind: db.kind,
			activeVersion: db.activeVersion,
			environmentName: db.environment.name
		}));
		return {
			success: true,
			output: {
				databases: dbList
			}
		};
	} catch (err) {
		console.log(`error`, err);
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
//-----------------------------
async function listEnvironmentVersions(environmentId, databaseName) {
	try {
		const filter = { environment: environmentId, name: databaseName };
		const databases = await this.findOne(filter, { _id: 1 })
			.populate('versions', 'version fromVersion createdAt')
			.exec();
		if (databases == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		let dbList = databases.versions.map((db) => ({
			version: db.version,
			fromVersion: db.fromVersion,
			kind: db.kind,
			createdAt: db.createdAt
		}));
		return {
			success: true,
			output: {
				databases: dbList
			}
		};
	} catch (err) {
		console.log(`error`, err);
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
//-----------------------------
async function getEnvironmentDatabaseDetails(environmentId, databaseName, version) {
	try {
		const filter = { environment: environmentId, name: databaseName };
		const database = await this.findOne(filter, { _id: 1 })
			.populate({
				path: 'versions',
				select: 'version',
				match: { version }
			})
			.exec();
		if (database == null || database.versions.length === 0) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		const details = await DatabaseVersion.findOne(
			{ _id: database.versions[0]._id },
			{ _id: 0, __v: 0, databasePassword: 0 }
		)
			.populate('createdBy', 'username -_id')
			.exec();

		return {
			success: true,
			output: {
				database: details
			}
		};
	} catch (err) {
		console.log(`error`, err);
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
//---------------------------------------
async function deleteDatabase(userId, environmentId, databaseName) {
	let doc;
	try {
		// Check if such version for such application exists
		const filter = { environment: new ObjectId(environmentId), name: databaseName };
		doc = await this.findOne(filter).exec();
		if (doc == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		// TODO: This is just the basic condition for now, has to be refined later as we use the database and figure out the common usage patterns
		let canDelete = false;
		if (doc.status.code === 'destroyed' || !doc.activeVersion) {
			canDelete = true;
		}
		if (!canDelete) {
			return {
				success: false,
				message: 'Cannot delete the environment, it needs to be destroyed first'
			};
		}
		const dbVersionFilter = { environmentDatabase: doc._id };
		await DatabaseVersion.deleteMany(dbVersionFilter).exec();
		await this.findByIdAndDelete(doc._id).exec();
		return {
			success: true
		};
	} catch (err) {
		return {
			success: false,
			message: err.message
		};
	}
}
//-------------------------------------
async function setState(environmentId, databaseName, state) {
	try {
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
				validCurrentState = [ null, 'created', 'destroyed', 'destroy_failed', 'deploy_failed' ];
				break;
		}
		const filter = {
			// Note: at the moment I don't match the job in the state, not sure if it makes sense to verify the same job responsible for current state is updating it
			environment: environmentId,
			name: databaseName,
			'state.code': { $in: validCurrentState }
		};
		const app = await this.findOneAndUpdate(filter, { state }, { new: true }).exec();
		if (app == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: true
		};
	} catch (err) {
		console.error(`error: `, err.message);
		let message = err.message;
		return {
			success: false,
			message: message
		};
	}
}

module.exports = mongoose.model(modelName, environmentDatabaseServerSchema);
