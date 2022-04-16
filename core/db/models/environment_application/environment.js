// Note: this file contains the entities to support the applications v2. It includes environments and the applications.
const constants = require('../../../utils/constants');
const { decrypt } = require('../../../utils/encryption');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const Schema = mongoose.Schema;
const timeService = require('../../../services/time.service');
const EnvironmentApplicationModel = require('./application');
const EnvironmentDatabaseModel = require('./databaseServer');
const ApplicationVersionModel = require('./applicationVersion');
const DatabaseVersionModel = require('./databaseVersion');
const ProviderModel = require('../provider');
const metricModel = require('../environment_metric/environmentMetricProvider');

const modelName = 'environment';
const environmentSchema = new Schema(
	{
		tfCodePath: String, // Not used yet, assign the generated TF path on S3
		tfVersion: {
			type: String,
			default: '0.11.15', // At the moment this is the only supported value and should not accept it from the user
			required: true
		},
		accountId: {
			type: ObjectId,
			ref: 'Account',
			required: true
		},
		name: {
			type: String,
			unique: true,
			required: true
		},
		provider: {
			type: ObjectId,
			ref: 'Provider',
			required: true
		},
		providerName: {
			// todo: make sure in the validation this is always equal to the provider.backend.name
			type: String,
			enum: [ 'aws' ],
			default: 'aws',
			required: true
		},
		region: {
			type: String
		},
		description: String,
		createdAt: {
			type: Number,
			default: timeService.now
		},
		createdBy: {
			type: ObjectId,
			ref: 'User'
		},
		deployedAt: Number,
		deployedBy: {
			type: ObjectId,
			ref: 'User'
		},
		// todo: add validation. Valid values: ⏩[created, changed, deploying, modifying, done]⏪
		/*
  created: the environment is created for the first time (only once in the environment's lifetime)
  changed: the environment is already deployed, it's now changed (the change yet to be deployed) (happens with every change)
  deploying: for the environment in created state, deploy action puts it in deploying state (only once in the environment's lifetime)
  modifying: for the environment in changed state, deploy action puts it in modifying state (happens with every change)
  deployed: a successful deploy action moves the environment from created/changed state to deployed state (happens with every change/first time creation)
  failed: an unsuccessful deploy action moves the environment from created/changed state to failed state (happens with every change/first time creation)
  destroying: for the environment in deployed state, destroy action puts it in destroying state
  destroyed: a successful destroy action moves the environment from destroying state to destroyed state
  */
		status: {
			type: {
				_id: false,
				code: {
					code: String
				},
				reason: {
					operation: String, // todo: add validation. Valid values: ⏩[create, update, delete]⏪
					resource: String // todo: add validation. Valid values: ⏩[alb:<name>, ecs_cluster:<name>]⏪
				}
			},
			default: {
				code: 'created' // We don't provide reason for the status code ⏩created⏪
			}
		},
		lock: {
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
	{ discriminatorKey: 'providerName', _id: false }
);

environmentSchema.statics.lockEnvironment = lockEnvironment;
environmentSchema.statics.getAll = getAll;
environmentSchema.statics.listEnvironmentIdsByAccount = listEnvironmentIdsByAccount;
environmentSchema.statics.getEnvironmentProvider = getEnvironmentProvider;
environmentSchema.statics.getEnvironmentProviderName = getEnvironmentProviderName;
environmentSchema.statics.getEnvironmentDetails = getEnvironmentDetails;
environmentSchema.statics.setEnvironmentStatus = setEnvironmentStatus;
environmentSchema.statics.getEnvironmentIdAndProvider = getEnvironmentIdAndProvider;
environmentSchema.statics.getEnvironmentRegionAndProviderName = getEnvironmentRegionAndProviderName;
environmentSchema.statics.deleteEnvironment = deleteEnvironment;
environmentSchema.statics.clone = clone;

//-------------------------------------------------------------
async function lockEnvironment(accountId, environmentName, lockId) {
	try {
		const filter = { accountId: new ObjectId(accountId), name: environmentName, 'lock.isLocked': false };
		const doc = await this.findOne(filter).exec();
		if (doc == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		const newStatusCode = doc.status.code === 'created' ? 'deploying' : 'modifying';
		const update = {
			lock: {
				isLocked: true,
				id: lockId,
				lockedAt: Date.now()
			},
			'status.code': newStatusCode
		};
		const updated = await this.findOneAndUpdate(filter, update, { new: true }).exec();
		if (updated == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
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
//-------------------------------------------------------------
async function getAll(accountId) {
	try {
		const filter = { accountId: new ObjectId(accountId) };
		console.log(`filter`, filter);
		const docs = await this.find(filter, { name: 1, 'status.code': 1, 'lock.isLocked': 1, provider: 1 })
			.populate('provider')
			.exec();
		console.log(typeof docs);
		console.log(Object.keys(docs));
		if (docs == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		const environments = docs.map((d) => ({
			name: d.name,
			isLocked: d.lock.isLocked,
			statusCode: d.status.code,
			...(d.provider && {
				providerName: d.provider.backend.name,
				providerDisplayName: d.provider.displayName
			})
		}));
		return {
			success: true,
			output: {
				environments
			}
		};
	} catch (err) {
		return {
			success: false,
			message: err.message
		};
	}
}
//-------------------------------------------------------------
// This function returns all the fields of provider
async function getEnvironmentProvider(accountId, environmentName) {
	try {
		const filter = { accountId: new ObjectId(accountId), name: environmentName };
		const doc = await this.findOne(filter, {}).populate('provider').exec();
		if (doc == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: true,
			output: {
				environmentId: doc._id,
				provider: doc.provider
			}
		};
	} catch (err) {
		return {
			success: false,
			message: err.message
		};
	}
}
//-------------------------------------------------------------
async function getEnvironmentProviderName(accountId, environmentName) {
	try {
		const filter = { accountId: new ObjectId(accountId), name: environmentName };
		const doc = await this.findOne(filter, { providerName: 1 }).exec();
		if (doc == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: true,
			output: {
				providerName: doc.providerName
			}
		};
	} catch (err) {
		return {
			success: false,
			message: err.message
		};
	}
}
//-------------------------------------------------------------
async function getEnvironmentDetails(accountId, environmentName) {
	try {
		const filter = { accountId: new ObjectId(accountId), name: environmentName };
		const environment = await this.findOne(filter, { _id: 0 }).populate('provider', 'displayName').exec();
		if (environment == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: true,
			output: {
				environment
			}
		};
	} catch (err) {
		return {
			success: false,
			message: err.message
		};
	}
}
//-------------------------------------------------------------
async function setEnvironmentStatus(accountId, environmentName, statusCode) {
	try {
		const filter = { accountId: new ObjectId(accountId), name: environmentName };
		const doc = await this.findOne(filter).exec();
		if (doc == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		const update = {
			status: {
				code: statusCode
			}
		};
		const updated = await this.findOneAndUpdate(filter, update, { new: true }).exec();
		if (updated == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
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
//-------------------------------------------------------------
async function getEnvironmentIdAndProvider(accountId, environmentName) {
	try {
		const filter = { accountId: new ObjectId(accountId), name: environmentName };
		const doc = await this.findOne(filter, { _id: 1, provider: 1 }).populate('provider').exec();

		if (doc == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: true,
			output: {
				id: doc._id,
				providerName: doc.provider.backend.name,
				providerDisplayName: doc.provider.displayName
			}
		};
	} catch (err) {
		return {
			success: false,
			message: err.message
		};
	}
}
//-------------------------------------------------------------
async function listEnvironmentIdsByAccount(accountId, environmentName = null) {
	try {
		const filter = { accountId: new ObjectId(accountId), ...(environmentName ? { name: environmentName } : {}) };
		const docs = await this.find(filter, { _id: 1 }).exec();

		if (docs == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		const environmentIds = docs.map((d) => ({
			id: d._id
		}));
		return {
			success: true,
			output: {
				environmentIds
			}
		};
	} catch (err) {
		return {
			success: false,
			message: err.message
		};
	}
}
//-------------------------------------------------------------
async function getEnvironmentRegionAndProviderName(accountId, environmentName) {
	try {
		const filter = { accountId: new ObjectId(accountId), name: environmentName };
		const doc = await this.findOne(filter, { region: 1, provider: 1 }).populate('provider').exec();
		if (doc == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: true,
			output: {
				region: doc.region,
				providerName: doc.provider.displayName
			}
		};
	} catch (err) {
		return {
			success: false,
			message: err.message
		};
	}
}
//---------------------------------------
async function deleteEnvironment(userId, environmentId) {
	let doc;
	try {
		// Check if such version for such application exists
		const filter = { _id: new ObjectId(environmentId) };
		doc = await this.findOne(filter).exec();
		if (doc == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		// TODO: This is just the basic condition for now, has to be refined later as we use the database and figure out the common usage patterns
		let canDelete = false;
		if (doc.status.code === 'destroyed') {
			canDelete = true;
		} else if (!doc.deployedAt) {
			// the environment is not destroyed but it's never been deployed
			// Check if there are any dependencies for this environment
			const depFilter = { environment: environmentId };
			let promises = [];
			const app = EnvironmentApplicationModel.findOne(depFilter, { _id: 1 }).exec();
			promises.push(app);
			const db = EnvironmentDatabaseModel.findOne(depFilter, { _id: 1 }).exec();
			promises.push(db);
			const deps = await Promise.all(promises);
			if (deps.every((d) => d == null)) {
				canDelete = true;
			}
		}
		if (!canDelete) {
			return {
				success: false,
				message: 'Cannot delete the environment, it needs to be destroyed first'
			};
		}
		await this.findByIdAndDelete(environmentId).exec();
		await metricModel.deleteMetricProviders(environmentId);
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
//---------------------------------------
// applications and databases are arrays of shape ({ name: string, version: number})
/*
  This is a big one but don't panic. We know what we're doing.
  1. Find the Environment (and populate its provider for validation: new provider should be different from the existing one)
  2. Find the new Provider
  3. Find all the Applications and populate the specified version of them for the existing Environment 
  4. Find all the Databases    and populate the specified version of them for the existing Environment 
  5. Create a new Environment and set its provider to the one found in step 2
  6. Loop through all the Applications found in step 3 and create a clone of them (details explained in the body)
  7. Loop through all the Databases    found in step 4 and create a clone of them (details explained in the body)

  Note: The steps 3 and 4, also the steps 6 and 7 can (should) be executed at the same time, I don't do it now cause it's already messy and I'm behind the schedule....
*/
async function clone(accountId, userId, environmentName, newEnvironmentName, newProvider, { applications, databases }) {
	try {
		// Check if such version for such application exists
		const environmentFilter = { accountId, name: environmentName };
		const environment = await this.findOne(environmentFilter, { status: 0, lock: 0 })
			.populate('provider', 'displayName')
			.exec();
		if (environment == null) {
			return {
				success: false,
				message: `environment ${environmentName} not found`
			};
		}

		// todo: check the new provider is not the same as this environment's provider

		const provider = await ProviderModel.findOne(
			{ accountId: new ObjectId(accountId), displayName: newProvider },
			{ _id: 1 }
		).exec();

		if (!provider) {
			return {
				success: false,
				message: `provider ${newProvider} not found`
			};
		}

		const appsWithVersion = await Promise.all(
			applications.map((app) => {
				const applicationsFilter = { environment: environment._id, name: app.name };
				return EnvironmentApplicationModel.findOne(applicationsFilter, {
					_id: 1,
					name: 1,
					description: 1,
					kind: 1,
					versions: 1
				})
					.populate({
						path: 'versions',
						match: { version: app.version },
						select: '-_id -version -fromVersion -variables -createdAt -createdBy -deployedBy -isActivated -deployedAt'
					})
					.exec();
			})
		);

		const databasesWithVersion = await Promise.all(
			databases.map((db) => {
				const databasesFilter = { environment: environment._id, name: db.name };
				return EnvironmentDatabaseModel.findOne(databasesFilter, {
					_id: 1,
					name: 1,
					description: 1,
					kind: 1,
					versions: 1
				})
					.populate({
						path: 'versions',
						match: { version: db.version },
						select: '-_id -version -fromVersion -variables -createdAt -createdBy -deployedBy -isActivated -deployedAt'
					})
					.exec();
			})
		);

		let newEnvironment = Object.assign({}, environment.toJSON());
		delete newEnvironment._id;
		newEnvironment.name = newEnvironmentName;
		newEnvironment.provider = ObjectId(provider._id);

		// Save the environment and keep its id
		const newEnvDoc = new this(newEnvironment);
		let newEnvironmentId = await newEnvDoc.save();

		/*
      1. Create a new Application (keep the id: newAppId)
      2. Create a new Application Version (use newAppId and keep the id: newAppVersionId)
      3. Add the new Application Version to the versions of the Application (use newAppVersionId)
    */
		const saveNewApp = async (app) => {
			let newApp = Object.assign({}, app);
			delete newApp.versions;
			delete newApp._id;
			newApp.environment = newEnvironmentId;
			// Save the environment and get its id
			const newAppDoc = new EnvironmentApplicationModel(newApp);
			let newAppSaved = await newAppDoc.save();

			let newAppVersion = Object.assign({}, app.versions[0]);
			delete newAppVersion._id;
			newAppVersion.environmentApplication = newAppSaved;
			newAppVersion.createdBy = ObjectId(userId);

			const newAppVersionDoc = new ApplicationVersionModel(newAppVersion);
			let newAppVersionSaved = await newAppVersionDoc.save();

			const filter = { _id: newAppSaved._id };
			const update = {
				$push: {
					versions: newAppVersionSaved
				}
			};
			await EnvironmentApplicationModel.findOneAndUpdate(filter, update, { new: true }).exec();

			return {
				newApp,
				newAppVersion
			};
		};

		/*
      1. Create a new Database (keep the id: newDatabaseId)
      2. Create a new Database Version (use newDatabaseId and keep the id: newDatabaseVersionId)
      3. Add the new Database Version to the versions of the Database (use newDatabaseVersionId)
    */
		const saveNewDatabase = async (db) => {
			let newDatabase = Object.assign({}, db);
			delete newDatabase.versions;
			delete newDatabase._id;
			newDatabase.environment = newEnvironmentId;
			// Save the environment and get its id
			const newDatabaseDoc = new EnvironmentDatabaseModel(newDatabase);
			let newDatabaseSaved = await newDatabaseDoc.save();

			let newDatabaseVersion = Object.assign({}, db.versions[0]);
			delete newDatabaseVersion._id;
			newDatabaseVersion.environmentDatabase = newDatabaseSaved;
			newDatabaseVersion.createdBy = ObjectId(userId);

			const newDatabaseVersionDoc = new DatabaseVersionModel(newDatabaseVersion);
			let newDatabaseVersionSaved = await newDatabaseVersionDoc.save();

			const filter = { _id: newDatabaseSaved._id };
			const update = {
				$push: {
					versions: newDatabaseVersionSaved
				}
			};
			await EnvironmentDatabaseModel.findOneAndUpdate(filter, update, { new: true }).exec();

			return {
				newDatabase,
				newDatabaseVersion
			};
		};

		// Loop through all the applications and save a clone of them for the new environment
		await Promise.all(
			appsWithVersion.map((app) => {
				return saveNewApp(app.toJSON());
			})
		).catch((e) => console.log(e.message));

		// Loop through all the databases and save a clone of them for the new environment
		await Promise.all(
			databasesWithVersion.map((db) => {
				return saveNewDatabase(db.toJSON());
			})
		).catch((e) => console.log(e.message));

		return {
			success: true
		};
	} catch (err) {
		console.log(`error:`, err.message);
		return {
			success: false,
			message: err.message
		};
	}
}

module.exports = mongoose.model(modelName, environmentSchema);
