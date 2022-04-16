const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ApplicationAlarm = require('./applicationAlarm');

const userDefinedApplicationAlarmSchema = new Schema({
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


module.exports = ApplicationAlarm.discriminator('user_defined', userDefinedApplicationAlarmSchema);
