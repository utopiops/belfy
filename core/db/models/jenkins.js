const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const jenkinsDetailsSchema = new Schema({
    _id: false
},
    { discriminatorKey: 'kind', _id: false });

const jenkinsSchema = new Schema({
    userId: {
        type: 'ObjectId'
    },
    url: {
        type: 'String'
    },
    details: jenkinsDetailsSchema
});

const unmanagedJenkinsDetailsSchema = new Schema({
    adminToken: {
        type: 'String'
    }
});

const managedJenkinsDetailsSchema = new Schema({
    infrastructure: {
        _id: false,
        securityGroups: ['String'],
        rootVolumeType: {
            type: 'String'
        },
        rootVolumeDelOnTerm: {
            type: 'Boolean'
        },
        rootVolumeSize: {
            type: 'String'
        },
        rootVolumeIops: {
            type: 'String'
        },
        otherVolumes: [
            {
                _id: false,
                deviceName: {
                    type: 'String'
                },
                volumeSize: {
                    type: 'String'
                },
                volumeType: {
                    type: 'String'
                },
                delOnTerm: {
                    type: 'Boolean'
                },
                encryption: {
                    type: 'String'
                }
            }
        ],
        instanceType: {
            type: 'String'
        },
        ami: {
            type: 'String'
        },
        efsSelect: {
            type: 'String'
        },
        sshKey: {
            type: 'String'
        },
    },
    tokens: [
        {
            _id: false,
            key: {
                type: 'String'
            },
            value: {
                type: 'String'
            }
        }
    ],
    pipelines: ['Mixed'] // Todo: improve this
});

jenkinsSchema.path('details').discriminator('Managed', managedJenkinsDetailsSchema);
jenkinsSchema.path('details').discriminator('Unmanaged', unmanagedJenkinsDetailsSchema);

const Jenkins = mongoose.model('Jenkins', jenkinsSchema);

module.exports = Jenkins;