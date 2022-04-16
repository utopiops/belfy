const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const Schema = mongoose.Schema;
const timeService = require('../../../services/time.service');

const modelName = 'database_version_v2';

const databaseVersionSchema = new Schema(
	{
		environmentDatabase: {
			type: ObjectId,
			ref: 'env_database'
		},
		version: {
			type: Number,
			default: 1
		},
		fromVersion: {
			type: Number,
			default: 0 // Only for version 1
		},
		logProviderId: ObjectId,
		metricProviderId: ObjectId,
		kind: String,
		createdBy: {
			type: ObjectId,
			ref: 'User'
		},
		deployedAt: Number,
		deployedBy: {
			type: ObjectId,
			ref: 'User'
		},
		isActivated: {
			// This is a flag indicating whether the database version can be modified or not
			type: Boolean,
			default: false
		}
	},
	{ discriminatorKey: 'kind', _id: false, timestamps: true }
);

// indices
databaseVersionSchema.index({ environmentDatabase: 1, version: 1 }, { unique: true });

module.exports = mongoose.model(modelName, databaseVersionSchema);
