const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const Schema = mongoose.Schema;
const timeService = require('../../../services/time.service');
const constants = require('../../../utils/constants');
const { alarmStates } = require('./environmentAlarmStates');
const { alarmEffects } = require('./alarmEffects');
const { alarmStatusValues } = require('./alarmStatusValues');

const modelName = 'env_alarm';

const environmentAlarmSchema = new Schema({
    environment: {
        type: ObjectId,
        ref: 'environment',
    },
    name: String, // A unique name based on the underlying alarm provider like CloudWatch, Azure Monitor, Grafana
    createdBy: {
        type: ObjectId,
        ref: 'User'
    },
    deployedAt: Number,
    deployedBy: {
        type: ObjectId,
        ref: 'User'
    },
    state: {
        type: {
            code: {
                type: String,
                enum: Object.values(alarmStates)
            },
            reason: String, // Only for deploy_failed and destroy_failed
            jobId: String // used in the virtual. Only for deploying and destroying codes this gets a value
        },
        default: {
            code: 'to_deploy'
        }
    },
    status: {
        type: String,
        enum: Object.values(alarmStatusValues),
        default: alarmStatusValues.insufficientData
    },
    enabled: {
        type: Boolean, // false means paused. Notice that a disabled alarm is/should be deployed and is just paused
        default: true
    },
    effect: { // The effect of this alarm on the environment's status
        type: String,
        enum: Object.keys(alarmEffects),
        default: alarmEffects.none
    },
    extras: Object, // Things like evaluationPeriod go here. Note: this makes the validation difficult, what should I do?
    kind: {
        type: String,
        enum: ['predefined', 'user_defined']
    },
    resource: String, // <provider>::<resource_type>::[parent/]<resource_name>
}, { discriminatorKey: 'kind', timestamps: true });

environmentAlarmSchema.index({ environment: 1, name: 1 }, { unique: true });

environmentAlarmSchema.statics.listAlarms = listAlarms;
environmentAlarmSchema.statics.listEnvironmentsAlarmStatus = listEnvironmentsAlarmStatus;
environmentAlarmSchema.statics.listPredefinedAlarmsTypes = listPredefinedAlarmsTypes;
environmentAlarmSchema.statics.getAlarm = getAlarm;
environmentAlarmSchema.statics.getAlarmState = getAlarmState;
environmentAlarmSchema.statics.deleteAlarm = deleteAlarm;
environmentAlarmSchema.statics.updateState = updateState;
environmentAlarmSchema.statics.updateStatus = updateStatus;

//---------------------------------------
async function listAlarms(environmentId) {
    try {
        const filter = { environment: environmentId };
        const docs = await this.find(filter, { _id: 0, __v: 0 }).populate('createdBy', 'username').exec();
        if (docs == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        return {
            success: true,
            output: {
                alarms: docs
            }
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
async function listEnvironmentsAlarmStatus(environmentIds) {
    try {
        const filter = { environment: { $in: environmentIds } };
        const docs = await this.aggregate([
            {
                $match: filter
            },
            {
                $group: {
                    _id: "$environment",
                    alarms: { $push: { status: "$status", effect: "$effect" } }
                }
            }
        ]).exec();
        if (docs == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        return {
            success: true,
            output: {
                alarms: docs
            }
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
async function listPredefinedAlarmsTypes(environmentId) {
    try {
        const filter = { environment: environmentId, kind: 'predefined' };
        const docs = await this.find(filter, { type: 1, resource: 1 }).exec();
        if (docs == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        return {
            success: true,
            output: {
                alarms: docs.map(d => ({ type: d.type, resource: d.resource }))
            }
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
async function getAlarm(environmentId, name) {
    try {
        const filter = { environment: environmentId, name };
        const doc = await this.findOne(filter, { _id: 0 }).exec();
        if (doc == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        return {
            success: true,
            output: {
                alarm: doc
            }
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
async function getAlarmState(environmentId, name) {
    try {
        const filter = { environment: environmentId, name };
        const doc = await this.findOne(filter, { state: 1 }).exec();
        if (doc == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        return {
            success: true,
            output: {
                state: doc.state
            }
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
async function deleteAlarm(environmentId, name) {
    try {
        const filter = {
            environment: environmentId,
            name
        };
        const doc = await this.findOneAndDelete(filter).exec();
        if (doc == null || doc.deletedCount === 0) {
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
        return {
            success: false,
            message: message
        };
    }
}
//---------------------------------------
async function updateState(environmentId, name, newState, jobId = '') {
    try {
        const filter = {
            environment: environmentId,
            name
        };
        const reason = [alarmStates.deployFailed, alarmStates.destroyFailed].indexOf(newState.stateCode) !== -1 ? newState.reason : '';
        const update = {
            state: {
                code: newState.stateCode,
                ...(reason ? { reason } : {}),
                ... (jobId ? { jobId } : {})
            }
        }
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
        console.log(`error`, err);
        let message = err.message;
        return {
            success: false,
            message: message
        };
    }
}
//---------------------------------------
async function updateStatus(name, newStatus) {
    try {
        const filter = { name };
        const update = { status: newStatus };
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
        console.error(`error:`, err);
        return {
            success: false,
            message: err.message
        };
    }
}


module.exports = mongoose.model(modelName, environmentAlarmSchema);
