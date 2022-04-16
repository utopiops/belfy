const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const constants = require('../../../utils/constants');
const ApplicationAlarm = require('./applicationAlarm');
const { alarmTypes } = require('./applicationAlarmTypes');
const { alarmStates } = require('./applicationAlarmStates');

const predefinedApplicationAlarmSchema = new Schema({
    type: {
        type: String,
        enum: alarmTypes
    },
    threshold: Number,
    period: Number, // in second
});

predefinedApplicationAlarmSchema.index({ environmentApplication: 1, type: 1 }, { unique: true });
predefinedApplicationAlarmSchema.statics.addAlarm = addAlarm;
predefinedApplicationAlarmSchema.statics.updateAlarm = updateAlarm;

//---------------------------------------
async function addAlarm({ userId, applicationId, type, name, threshold, period, extras }) {
    try {
        const applicationAlarm = {
            environmentApplication: applicationId,
            name: `app-${name}`,
            type,
            threshold,
            period,
            createdBy: userId,
            ... (extras ? { extras } : {}),
        }
        const doc = new this(applicationAlarm);
        await doc.save();
        return {
            success: true,
            output: {
                name: doc.name
            }
        };
    } catch (err) {
        console.log(`error:`, err.message);
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
async function updateAlarm({ applicationId, name, threshold, period, extras }) {
    try {
        const filter = {
            environmentApplication: applicationId,
            name,
            'state.code': { $in: [alarmStates.toDeploy, alarmStates.deployed] }
        };
        const update = {
            threshold,
            period,
            ... (extras ? { extras } : {}),
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



module.exports = ApplicationAlarm.discriminator('predefined', predefinedApplicationAlarmSchema);