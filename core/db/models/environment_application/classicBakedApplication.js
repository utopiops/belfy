const { Schema } = require('mongoose');
const ApplicationVersion = require('./applicationVersion');
const ObjectId = require('mongoose').Types.ObjectId;
const constants = require('../../../utils/constants');
const uuid = require('uuid/v4');


const InstanceGroupSchema = new Schema({
    _id: false,
    kind: String,
    name: {
        type: String,
        default: uuid(),
        required: true
    },
    userData: String,
    displayName: String,
    count: Number,
    instanceType: {
        type: String,
        required: true
    },
    rootVolumeSize: {
        type: Number,
        default: 100, // no reason for choosing this value!
        required: true
    },
    keyPairName: String,
    labels: [String],
    isSpot: {
        type: Boolean,
        default: false
    }
});


const classicBakedApplicationSchema = new Schema({
    portsExposed: {
        lb: {
            // todo: remove id, just use name
            name: String,
            ports: [Number], // Limitation: At the moment we assume EC2 receives traffic from the ALB on the same port as it's exposed on ALB
            useForDns: {
                type: Boolean,
                default: false
            },
            dnsPrefix : String // todo: Add validation, this should not conflict with other application names
        },
        nlb: {
            // todo: remove id, just use name
            name: String,
            ports: {
                _id: false,
                type: [{
                    portNumber: Number,
                    protocol: String,
                    certificateArn: String
                }],
                default: []
            },
            useForDns: {
                type: Boolean,
                default: false
            },
            dnsPrefix : String // todo: Add validation, this should not conflict with other application names
        }
    },
    iamRoleName: String,
    defaultAmiId: {
        type: String,
        // required: true // TODO: CHECK IF IT'S FKD UP
    },
    instanceGroups: {
        type: [
            InstanceGroupSchema
        ],
        default: []
    }
}, { toJSON: { virtuals: true } });

classicBakedApplicationSchema.virtual('alb', {
    ref: 'environment',
    localField: 'portsExposed.lb.name',
    foreignField: 'albList.displayName',
    select: 'name',
    justOne: true
});
classicBakedApplicationSchema.virtual('nlb', {
    ref: 'environment',
    localField: 'portsExposed.nlb.name',
    foreignField: 'nlbList.displayName',
    select: 'name',
    justOne: true
});

module.exports = ApplicationVersion.discriminator(constants.applicationKinds.classicBaked, classicBakedApplicationSchema);