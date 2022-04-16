// TODO: DELETE

const constants = require('../../utils/constants');
const ObjectId = require('mongoose').Types.ObjectId;
const Environment = require('./environment_application/environment');
require('dotenv').config();
const { encrypt, decrypt } = require('../../utils/encryption');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const AWS = require('aws-sdk');
const awsApiVersions = require('../../utils/awsApiVersions');

const modelName = 'Provider_old';

const backendSchema = new Schema({}, { discriminatorKey: 'name', _id: false }); //TODO: [MVP-269] Allow multiple providers of the same provider type per account

const providerSchema = new Schema({
	status: {
		type: String,
		default: constants.resourceStatus.creating
	},
	accountId: {
		type: ObjectId
	},
	displayName: {
		type: String
	},
	backend: backendSchema
});

providerSchema.index({ displayName: 1, accountId: 1 }, { unique: true });

const awsProviderSchema = new Schema(
	{
		accessKeyId: String,
		secretAccessKey: String,
		cloudProviderAccountId: String,
		bucketName: String,
		region: String,
		dynamodbName: String,
		kmsKeyId: String,
		stateKey: String
	},
	{ _id: false }
);

awsProviderSchema.virtual('summary').get(function() {
	return {
		name: this.name,
		region: this.region,
		bucketName: this.bucketName,
		dynamodbName: this.dynamodbName,
		kmsKeyId: this.kmsKeyId
	};
});
awsProviderSchema.virtual('credentials').get(function() {
	return {
		accessKeyId: this.accessKeyId,
		secretAccessKey: this.secretAccessKey
	};
});
awsProviderSchema.virtual('decryptedCredentials').get(function() {
	console.log(`inside decryptedCredentials`);
	console.log(`this.accessKeyId`, this.accessKeyId);
	console.log(`this.secretAccessKey`, this.secretAccessKey);
	return {
		accessKeyId: decrypt(this.accessKeyId),
		secretAccessKey: decrypt(this.secretAccessKey)
	};
});

const azureProviderSchema = new Schema({
	attr: 'String'
});

providerSchema.path('backend').discriminator(constants.applicationProviders.aws, awsProviderSchema);
providerSchema.path('backend').discriminator(constants.applicationProviders.azure, azureProviderSchema);

providerSchema.statics.getDetails = getDetails;
providerSchema.statics.add = addProvider;
providerSchema.statics.updateCredentials = updateCredentials;
providerSchema.statics.getAccountCredentials = getAccountCredentials;
providerSchema.statics.getSameTypeProviders = getSameTypeProviders;
providerSchema.statics.canDeleteProvider = canDeleteProvider;
providerSchema.statics.getProvider = getProvider;
providerSchema.statics.deleteProvider = deleteProvider;

// ------------- model middlewares

// // Encrypt Provider credentials before saving object to database
// providerSchema.pre('save', function(next) {
// 	this.backend.accessKeyId = encrypt(this.backend.accessKeyId);
// 	this.backend.secretAccessKey = encrypt(this.backend.secretAccessKey);
// 	next();
// });
// providerSchema.post([ 'updateOne', 'findOneAndUpdate' ], async function() {
// 	const updatedProviderList = await this.model.find(this.getQuery());
// 	const updatedProvider = updatedProviderList[0];
// 	updatedProvider.save();
// });
// // Decrypt Provider credentials after executing search query
// providerSchema.post('findOne', function(provider) {
// 	if (provider == null) return;
// 	provider.backend.accessKeyId = decrypt(provider.backend.accessKeyId);
// 	provider.backend.secretAccessKey = decrypt(provider.backend.secretAccessKey);
// });

// // Decrypt Provider credentials before executing update query
// providerSchema.pre('findOneAndUpdate', async function(next) {
// 	const oldProviderList = await this.model.find(this.getQuery());
// 	if (!oldProviderList[0]) {
// 		next(new Error(constants.errorMessages.elementNotFound));
// 	}
// 	const oldProvider = oldProviderList[0];
// 	oldProvider.backend.accessKeyId = decrypt(oldProvider.backend.accessKeyId);
// 	oldProvider.backend.secretAccessKey = decrypt(oldProvider.backend.secretAccessKey);
// 	next();
// });

//-------------- model methods
providerSchema.methods.getSummary = getSummary;

/**
 * 
 * @param {string} accountId Account ID
 * @param {string} name Provider name
 * If name provided returns the summary of the specific provider with the given name for the account with id equal to accountID,
 * otherwise returns the summary of all the providers of the account.
 */
async function getSummary(accountId, name = null) {
	var filter = { accountId: new ObjectId(accountId) };
	if (name) {
		filter['backend.name'] = name;
	}
	const providers = await this.model(modelName).find(filter).exec();
	// TODO: replace status with state, the same way it's done for applications, also the change to be applied in the infrastructure worker too
	return (
		providers &&
		providers.map((p) => ({ id: p._id, displayName: p.displayName, state: p.status, ...p.backend.summary }))
	);
}
//-----------------------------------------------
async function getDetails(accountId, displayName) {
	var filter = { accountId: new ObjectId(accountId), displayName };
	try {
		const result = await this.findOne(filter).exec();
		if (result == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		const provider = { status: result.status, ...result.backend.summary };
		return {
			success: true,
			output: {
				provider
			}
		};
	} catch (err) {
		console.error(`error`, err);
		let message = err.message;
		return {
			success: false,
			message: message
		};
	}
}
//-----------------------------------------------
async function addProvider(provider) {
	try {
		const doc = new this(provider);
		await doc.save();
		return {
			success: true
		};
	} catch (err) {
		console.error(`error`, err);
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
//-----------------------------------------------
async function updateCredentials(accountId, displayName, credentials) {
	try {
		var filter = { accountId: new ObjectId(accountId), displayName };
		const provider = await this.findOne(filter).exec();
		if (provider == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}

		// Check if the credentials provided by user belong to the same cloud provider account ID
		AWS.config.update({
			accessKeyId: credentials.accessKeyId,
			secretAccessKey: credentials.secretAccessKey
		});
		const sts = new AWS.STS({ apiVersion: awsApiVersions.sts });
		const newUserIdentity = await sts.getCallerIdentity().promise();
		if (newUserIdentity.Account !== provider.backend.cloudProviderAccountId) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		let update = Object.assign({}, provider.toObject());
		update.backend.accessKeyId = credentials.accessKeyId;
		update.backend.secretAccessKey = credentials.secretAccessKey;
		const doc = await this.findOneAndUpdate(filter, update, { new: true }).exec();
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
		console.error(`error`, err);
		let message = err.message;
		return {
			success: false,
			message: message
		};
	}
}
//-----------------------------------------------
async function getAccountCredentials(accountId, displayName) {
	var filter = { accountId: new ObjectId(accountId), displayName };
	try {
		const result = await this.findOne(filter, { backend: 1 }).exec();
		if (result == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		const credentials = result.backend.credentials;
		return {
			success: true,
			output: {
				credentials
			}
		};
	} catch (err) {
		console.error(`error`, err);
		let message = err.message;
		return {
			success: false,
			message: message
		};
	}
}
//-----------------------------------------------
async function getSameTypeProviders(accountId, backendName, displayName) {
	var filter = { accountId: new ObjectId(accountId), 'backend.name': backendName, displayName: { $ne: displayName } };
	try {
		const result = await this.find(filter, { displayName: 1 }).exec();
		return {
			success: true,
			output: {
				// This is for backwards compatibility. replace it everywhere with outputs
				providers: result.map((r) => r.displayName)
			},
			outputs: {
				providers: result.map((r) => r.displayName)
			}
		};
	} catch (err) {
		console.error(`error: `, err.message);
		return {
			success: false,
			message: err.message
		};
	}
}

async function canDeleteProvider(accountId, displayName) {
	try {
		const result = await this.getProvider(accountId, displayName);
		console.log(result); // !!!
		if (!result.success) {
			return result;
		}

		const provider = result.output.provider;
		const providerId = new ObjectId(provider._id);
		var filter = { provider: providerId };
		const environment = await Environment.findOne(filter).exec();
		if (environment != null) {
			return {
				success: false,
				message: "We can't delete provider"
			};
		}
		return {
			success: true,
			output: {
				provider
			}
		};
	} catch (error) {
		console.error(`error: `, err.message);
		return {
			success: false,
			message: err.message
		};
	}
}

async function getProvider(accountId, displayName) {
	var filter = { accountId: new ObjectId(accountId), displayName };
	try {
		const result = await this.findOne(filter).exec();
		if (result == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: true,
			output: {
				provider: result
			}
		};
	} catch (err) {
		console.error(`error: `, err.message);
		console.log(err); // !!!
		return {
			success: false,
			message: err.message
		};
	}
}

async function deleteProvider(providerId) {
	try {
		const result = await this.findByIdAndDelete(providerId).exec();
		if (result == null) {
			return {
				success: false,
				message: constants.errorMessages.models.elementNotFound
			};
		}
		return {
			success: true,
			output: {
				provider: result
			}
		};
	} catch (err) {
		console.error(`error: `, err.message);
		return {
			success: false,
			message: err.message
		};
	}
}

module.exports = mongoose.model(modelName, providerSchema);
