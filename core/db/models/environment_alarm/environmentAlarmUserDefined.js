const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const EnvironmentAlarm = require('./environmentAlarm');

const userDefinedEnvironmentAlarmSchema = new Schema({
    displayName: String,
    metric: String,
    operator: {
        type: String,
        enum: ['lt', 'lte', 'eq', 'gt', 'gte']
    },
    statistic: {
        type: String,
        enum: []
    },
    threshold: Number,
    period: Number, // in second
    dimension: Object,
});


module.exports = EnvironmentAlarm.discriminator('user_defined', userDefinedEnvironmentAlarmSchema);
