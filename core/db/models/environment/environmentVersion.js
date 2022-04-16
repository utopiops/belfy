const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const timeService = require('../../../services/time.service');

const EnvironmentVersion = new Schema(
	{
		version: {
			type: Number,
			default: 1
		},
		fromVersion: {
			type: Number,
			default: 0 // Only for version 1
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
		isActivated: {
			// This is a flag indicating whether the database version can be modified or not
			type: Boolean,
			default: false
		},
    isCorrupted: {
      type: Boolean,
      default: false
    }
	},
	{ discriminatorKey: 'providerName', _id: false, timestamps: true }
);

module.exports = EnvironmentVersion;
