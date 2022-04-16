const { Schema } = require('mongoose');
const ApplicationVersion = require('./applicationVersion');
const ObjectId = require('mongoose').Types.ObjectId;
const constants = require('../../../utils/constants');

const ecsApplicationDetailsSchema = new Schema({
    clusterId: { // todo: remove, use name
        type: ObjectId,
        required: true
    },
    clusterName: {
        type: String,
        // required: true
    },
    rds: {
        id: { // todo: remove, just use name
            type: ObjectId
        },
        name: {
            type: String
        },
        setAsVariable: {
            type: String,
            default: "DB_HOST"
        }
    },
    healthChecks: {
        path: {
            type: String,
            default: '/'
        },
        matcher: {
            type: String,
            default: '200-299'
        }
    },
    taskDefinition: {
        serviceDesiredCount: {
            type: String
        },
        cpu: {
            type: String
        },
        memory: {
            type: String
        },
        taskRoleArn: {
            type: String
        },
        networkMode: {
            type: String
        },
        tags: [{
            _id: false,
            key: {
                type: String
            },
            value: {
                type: String
            }
        }],
        volumes: [{
            _id: false,
            name: {
                type: String
            },
            sourcePath: {
                type: String
            },
            type: {
                type: String
            }
        }],
        containers: [{
            injectedEnvironmentVariables: {
                rds: {
                    _id: false,
                    type: [
                        {
                            name: String,
                            setAsVariable: String
                        }
                    ],
                    default: []
                }
            },
            _id: false,
            name: {
                type: String
            },
            image: {
                type: String
            },
            hardLimit: {
                type: Number
            },
            softLimit: {
                type: Number
            },
            cpu: {
                type: Number
            },
            memory: {
                type: Number
            },
            memoryReservation: {
                type: Number
            },
            mountPoints: [
                {
                    _id: false,
                    sourceVolume: {
                        type: String
                    },
                    containerPath: {
                        type: String
                    },
                    readOnly: {
                        type: Boolean
                    }
                }
            ],
            portMappings: [
                {
                    _id: false,
                    hostPort: {
                        type: Number,
                        default: 0
                    },
                    containerPort: {
                        type: Number
                    },
                    protocol: {
                        type: String,
                        default: 'tcp'
                    }
                }
            ],
            environment:
            {
                default: undefined,
                type: [
                    {
                        _id: false,
                        name: {
                            type: String
                        },
                        value: {
                            type: String
                        }
                    }
                ]
            },
            secrets:
            {
                default: undefined,
                type: [
                    {
                        _id: false,
                        name: {
                            type: String
                        },
                        valueFrom: {
                            type: String
                        }
                    }
                ]
            },
            essential: {
                type: Boolean
            },
            command: {
                type: String
            },
            logDriver: {
                type: String
            },
            logOptions: {
                default: undefined,
                type:
                    [
                        {
                            _id: false,
                            key: {
                                type: String
                            },
                            value: {
                                type: String
                            }
                        }
                    ]
            },
            readOnlyRoot: {
                type: Boolean
            },
            resourceLimits: {
                default: undefined,
                type: [
                    {
                        _id: false,
                        limitName: {
                            type: String
                        },
                        softLimit: {
                            type: String
                        },
                        hardLimit: {
                            type: String
                        }
                    }
                ]
            },
            dockerLabels: {
                default: undefined,
                type: [
                    {
                        _id: false,
                        key: {
                            type: String
                        },
                        value: {
                            type: String
                        }
                    }
                ]
            }
        }],
    },
    dnsSettings: {
        type: {
            _id: false,
            albId: ObjectId, // TODO: remove and just user name
            albName: String,
            protocol: String,
            certificate: String,
            exposedAsPort: Number,
            containerToExpose: Number,
            portToExpose: Number,
        }
    },
}, { toJSON: { virtuals: true } });

ecsApplicationDetailsSchema.virtual('cluster', {
    ref: 'environment',
    localField: 'clusterName',
    foreignField: 'ecsClusterList.displayName',
    justOne: true
});

ecsApplicationDetailsSchema.virtual('alb', {
    ref: 'environment',
    localField: 'dnsSettings.albName',
    foreignField: 'albList.displayName',
    select: 'name',
    justOne: true
});

ecsApplicationDetailsSchema.virtual('rdsDetails', {
    ref: 'env_database_server',
    localField: 'rds.name',
    foreignField: 'name',
    justOne: true
});

module.exports = ApplicationVersion.discriminator(constants.applicationKinds.ecs, ecsApplicationDetailsSchema);