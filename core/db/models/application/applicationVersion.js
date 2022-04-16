// Note: this file contains the entities to support the applications v2. It includes environments and the applications.
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const Schema = mongoose.Schema;

const modelName = 'application_version_v3';

const applicationVersionSchema = new Schema({
    environmentApplication: {
        type: ObjectId,
        ref: 'applications_v3'
    },
    version: {
        type: Number,
        default: 1,
    },
    fromVersion: {
        type: Number,
        default: 0, // Only for version 1
    },
    logProviderId: ObjectId,
    metricProviderId: ObjectId,
    kind: String,
    variables: {
        type: [
            {
                _id: false,
                name: 'String',
                defaultValue: 'String'
            }
        ],
        default: []
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
    isActivated: { // This is a flag indicating whether the application version can be modified or not
        type: Boolean,
        default: false
    },
    isCorrupted: {
      type: Boolean,
      default: false
    }
}, { discriminatorKey: 'kind', _id: false, timestamps: true });

// indices
applicationVersionSchema.index({ environmentApplication: 1, version: 1 }, { unique: true });

module.exports = mongoose.model(modelName, applicationVersionSchema);
