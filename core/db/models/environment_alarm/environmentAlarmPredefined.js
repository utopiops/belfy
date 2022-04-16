const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const constants = require('../../../utils/constants');
const EnvironmentAlarm = require('./environmentAlarm');
const { alarmTypes } = require('./environmentAlarmTypes');
const { alarmStates } = require('./environmentAlarmStates');

const predefinedEnvironmentAlarmSchema = new Schema({
    type: {
        type: String,
        enum: alarmTypes
    },
    threshold: Number,
    period: Number, // in second
});

predefinedEnvironmentAlarmSchema.index({ environment: 1, type: 1 }, { unique: true });
predefinedEnvironmentAlarmSchema.statics.addAlarm = addAlarm;
predefinedEnvironmentAlarmSchema.statics.updateAlarm = updateAlarm;

//---------------------------------------
async function addAlarm({ userId, environmentId, type, name, threshold, period, resource, extras }) {
    try {
        const environmentAlarm = {
            environment: environmentId,
            resource,
            name: `env-${name}`,
            type,
            threshold,
            period,
            createdBy: userId,
            ... (extras ? extras : {}),
        }
        const doc = new this(environmentAlarm);
        await doc.save();
        return {
            success: true,
            output: {
                name: doc.name
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
async function updateAlarm({ environmentId, name, threshold, period, extras }) {
    try {
        const filter = {
            environment: environmentId,
            name,
            'state.code': { $in: [alarmStates.toDeploy, alarmStates.deployed] }
        };
        const update = {
            threshold,
            period,
            ... (extras ? extras : {}),
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



module.exports = EnvironmentAlarm.discriminator('environment_alarm_predefined', predefinedEnvironmentAlarmSchema, 'predefined');