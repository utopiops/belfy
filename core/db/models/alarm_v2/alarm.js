const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Schema = mongoose.Schema;
const timeService = require('../../../services/time.service');
const { alarmStatusValues } = require('./alarmStatusValues');

const modelName = 'alarm';

const applicationAlarmSchema = new Schema({
    application: {
        type: ObjectId,
        ref: 'applications_v3',
    },
    environment: {
        type: ObjectId,
        ref: 'environment_v2',
    },
    alarmName: {
        type: String,
        unique: true,
    }, // A unique name based on the underlying alarm provider like CloudWatch, Azure Monitor, Grafana
    displayName: {
        type: String,
    }, 
    description: {
        type: String,
    }, 
    alarmType: {
        type: String,
    }, 
    evaluationPeriods: {
        type: String,
        default: '2',
    },
    period: {
        type: String,
        default: '60',
    },
    threshold: {
        type: String,
        default: '',
    },
    createdBy: {
        type: ObjectId,
        ref: 'User',
    },
    deployedAt: Number,
    deployedBy: {
        type: ObjectId,
        ref: 'User',
    },
    accountId: {
        type: ObjectId,
        ref: 'Account',
        required: true
    },
    severity: {
        type: Number,
        default: 1,
    },
    state: {
        type: {
            _id: false,
            code: {
                code: String,
            },
            job: String,
        },
        default: {
            code: 'created',
        },
    },
    status: {
        type: String,
        enum: Object.values(alarmStatusValues),
        default: alarmStatusValues.insufficientData
    },
    enabled: {
        type: Boolean, // false means paused. Notice that a disabled alarm is/should be deployed and is just paused
        default: true,
    },
    effect: {
        // The effect of this alarm on the application's status
        type: String,
        enum: ['none', 'warning', 'critical'],
        default: 'none',
    },
    // classic baked specific
    instanceGroupDisplayName: {
        type: String,
    },
    // env specific
    environment_state: {
        type: {
            _id: false,
            bucket: String,
            key: String,
            region: String,
        },
    },
    // alb specific
    albDisplayName: {
        type: String,
    },
    ecsClusterName: {
        type: String,
    },
}, { timestamps: true });

// applicationAlarmSchema.index({ alarmName: 1 }, { unique: true });

module.exports = mongoose.model(modelName, applicationAlarmSchema);
