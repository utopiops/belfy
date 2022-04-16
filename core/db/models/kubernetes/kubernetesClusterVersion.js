const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Schema = mongoose.Schema;
const timeService = require('../../../services/time.service');

const modelName = 'kubernetes_cluster_version';
const kubernetesClusterVersionSchema = new Schema(
	{
		kubernetesCluster: {
			type: ObjectId,
			ref: 'kubernetes_cluster'
		},
		version: {
			type: Number,
			default: 1
		},
		fromVersion: {
			type: Number,
			default: 0 // Only for version 1
		},
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
kubernetesClusterVersionSchema.index({ kubernetesCluster: 1, version: 1 }, { unique: true });

module.exports = mongoose.model(modelName, kubernetesClusterVersionSchema);
