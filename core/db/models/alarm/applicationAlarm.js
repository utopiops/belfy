const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const Schema = mongoose.Schema;
const timeService = require('../../../services/time.service');
const constants = require('../../../utils/constants');
const { alarmStates } = require('./applicationAlarmStates');
const { alarmEffects } = require('./alarmEffects');
const { alarmStatusValues } = require('./alarmStatusValues');


const modelName = 'application_alarm';

const applicationAlarmSchema = new Schema({
    environmentApplication: {
        type: ObjectId,
        ref: 'env_application',
    },
    name: {
        type: String,
        unique: true,
    }, // A unique name based on the underlying alarm provider like CloudWatch, Azure Monitor, Grafana
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
            code: alarmStates.toDeploy
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
    effect: { // The effect of this alarm on the application's status
        type: String,
        enum: Object.values(alarmEffects),
        default: alarmEffects.none
    },
    extras: Object, // Things like evaluationPeriod go here. Note: this makes the validation difficult, what should I do?
    kind: {
        type: String,
        enum: ['predefined', 'user_defined']
    }
}, { discriminatorKey: 'kind' });

applicationAlarmSchema.index({ environmentApplication: 1, name: 1 }, { unique: true });

applicationAlarmSchema.statics.listAlarms = listAlarms;
applicationAlarmSchema.statics.listApplicationsAlarmStatus = listApplicationsAlarmStatus;
applicationAlarmSchema.statics.listPredefinedAlarmsTypes = listPredefinedAlarmsTypes;
applicationAlarmSchema.statics.getAlarm = getAlarm;
applicationAlarmSchema.statics.getAlarmState = getAlarmState;
applicationAlarmSchema.statics.deleteAlarm = deleteAlarm;
applicationAlarmSchema.statics.updateState = updateState;
applicationAlarmSchema.statics.updateStatus = updateStatus;

//---------------------------------------
async function listAlarms(applicationId) {
    try {
        const filter = { environmentApplication: applicationId };
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
async function listApplicationsAlarmStatus(applicationIds) {
    try {
        const filter = { environmentApplication: { $in: applicationIds } };
        const docs = await this.aggregate([
            {
                $match: filter
            },
            {
                $group: {
                    _id: "$environmentApplication",
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
async function listPredefinedAlarmsTypes(applicationId) {
    try {
        const filter = { environmentApplication: applicationId, kind: 'predefined' };
        const docs = await this.find(filter, { type: 1 }).exec();
        if (docs == null) {
            return {
                success: false,
                message: constants.errorMessages.models.elementNotFound
            };
        }
        return {
            success: true,
            output: {
                alarms: docs.map(d => d.type)
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
async function getAlarm(applicationId, name) {
    try {
        const filter = { environmentApplication: applicationId, name };
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
async function getAlarmState(applicationId, name) {
    try {
        const filter = { environmentApplication: applicationId, name };
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
async function deleteAlarm(applicationId, name) {
    try {
        const filter = {
            environmentApplication: applicationId,
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
async function updateState(applicationId, name, newState, jobId = '') {
    try {
        const filter = {
            environmentApplication: applicationId,
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
        console.log(`update:::`, update);
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
        console.error(`error`, err);
        return {
            success: false,
            message: err.message
        };
    }
}


module.exports = mongoose.model(modelName, applicationAlarmSchema);
