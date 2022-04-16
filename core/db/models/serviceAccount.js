const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const Schema = mongoose.Schema;
const timeService = require('../../services/time.service');
const constants = require('../../utils/constants');

const modelName = 'ServiceAccount';
const ServiceAccountSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    accountId: {
        type: ObjectId,
        ref: 'Account',
        required: true
    },
    createdBy: {
        type: ObjectId,
        ref: 'User'
    },
}, { timestamps: true });

ServiceAccountSchema.index({ name: 1, accountId: 1 }, { unique: true });

/// statics

// Creates an ecs application
ServiceAccountSchema.statics.getAll = getAll;
ServiceAccountSchema.statics.getServiceAccount = getServiceAccount;
ServiceAccountSchema.statics.deleteServiceAccount = deleteServiceAccount;
ServiceAccountSchema.statics.add = add;


// Implementations
//---------------------------------------
async function getAll(accountId) {
    try {
        const filter = { accountId: accountId };
        const doc = await this.find(filter, { _id: 0, __v: 0 })
            .populate('createdBy', 'username').exec();
        if (doc == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        const serviceAccounts = doc.map(sa => ({
            name: sa.name,
            createdAt: sa.createdAt,
            createdBy: sa.createdBy.username
        }));
        return {
            success: true,
            output: {
                serviceAccounts
            }
        }
    } catch (err) {
        console.log(`error`, err);
        let message = err.message;
        return {
            success: false,
            message: message
        };
    }
}
//---------------------------------------
async function getServiceAccount(accountId, name) {
    try {
        const filter = { accountId: accountId, name };
        const doc = await this.findOne(filter, { _id: 0, __v: 0 })
            .populate('createdBy', 'username').exec();
        if (doc == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        const serviceAccount = {
            name: doc.name,
            createdAt: doc.createdAt,
            createdBy: doc.createdBy.username
        };
        return {
            success: true,
            output: {
                serviceAccount
            }
        }
    } catch (err) {
        console.log(`error`, err);
        let message = err.message;
        return {
            success: false,
            message: message
        };
    }
}
//---------------------------------------
async function deleteServiceAccount(accountId, name) {
    try {
        const filter = { accountId: accountId, name };
        const result = await this.findOneAndDelete(filter).exec();
        if (!result) {
            return {
                success: false,
                message: 'Not found'
            };
        }
        return {
            success: true
        };
    } catch (err) {
        console.log(`error`, err);
        let message = err.message;
        return {
            success: false,
            message: message
        };
    }
}
//---------------------------------------
async function add(data) {
    try {
        const { name, accountId, userId: createdBy } = data;
        const sa = {
            name,
            accountId,
            createdBy,
        }
        const serviceAccount = new this(sa);
        await serviceAccount.save();
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

const ServiceAccountModel = mongoose.model(modelName, ServiceAccountSchema);

module.exports = ServiceAccountModel;