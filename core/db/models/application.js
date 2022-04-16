const constants = require('../../utils/constants');
const mongoose  = require('mongoose');
const ObjectId  = require('mongoose').Types.ObjectId;
const Schema    = mongoose.Schema;

// Schema definitions
const modelName = 'Application';

/***
 * Schema to store the instance groups shared between the ecs clusters of the environment.
 * The ecs applications reference the instance groups by their names
*/
const InstanceGroupSchema = new Schema({
    _id: false,
    kind: 'String',
    name: 'String',
    displayName: 'String',
    count: 'Number',
    instanceType: 'String',
    rootVolumeSize: 'Number',
    labels: ['String']
});

const applicationDetailsSchema = new Schema({
    name: {
        type: 'String'
    },
    logProviderId: 'ObjectId',
    metricProviderId: 'ObjectId',
    instanceGroup: 'String',
    variables: {
        type: [
            {
                _id: false,
                name: 'String',
                currentValue: 'String',
                defaultValue: 'String'
            }
        ],
        default: []
    }
}, { discriminatorKey: 'kind', _id: false });

const environmentSchema = new Schema({
    _id: false,
    name: {
        type: 'String',
        unique: true
    },
    providerName: { // TODO: Delete, with the provider property this has become redundant
        type: 'String',
        default: constants.applicationProviders.aws
    },
    provider: {
     type: Schema.Types.ObjectId, 
     ref: 'Provider' ,
    },
    region: {
        type: 'String'
    },
    description: {
        type: 'String'
    },
    apps: [
        applicationDetailsSchema
    ],
    instanceGroups: [
        InstanceGroupSchema
    ]
});

const ecsApplicationDetailsSchema = new Schema({
    taskDefinition: {
        serviceDesiredCount: {
            type: 'String'
        },
        cpu: {
            type: 'String'
        },
        memory: {
            type: 'String'
        },
        exposeProtocol: {
            type: 'String'
        },
        containerPort: {
            type: 'Number'
        },
        lbPort: {
            type: 'Number'
        },
        lb: {
            _id: false,
            protocol: {
                type: 'String'
            },
            listenerPort: {
                type: 'Number'
            },
            type: {
                type: 'String',
                default: 'alb'
            },
            containerPort: {
                type: 'Number'
            }
        },
        taskRoleArn: {
            type: 'String'
        },
        networkMode: {
            type: 'String'
        },
        tags: [{
            _id: false,
            key: {
                type: 'String'
            },
            value: {
                type: 'String'
            }
        }],
        volumes: [{
            _id: false,
            name: {
                type: 'String'
            },
            sourcePath: {
                type: 'String'
            },
            type: {
                type: 'String'
            }
        }],
        containers: [{
            _id: false,
            name: {
                type: 'String'
            },
            image: {
                type: 'String'
            },
            hardLimit: {
                type: 'Number'
            },
            softLimit: {
                type: 'Number'
            },
            cpu: {
                type: 'Number'
            },
            memory: {
                type: 'Number'
            },
            memoryReservation: {
                type: 'Number'
            },
            mountPoints: [
                {
                    _id: false,
                    sourceVolume: {
                        type: 'String'
                    },
                    containerPath: {
                        type: 'String'
                    },
                    readOnly: {
                        type: 'Boolean'
                    }
                }
            ],
            portMappings: [
                {
                    _id: false,
                    hostPort: {
                        type: 'Number',
                        default: 0
                    },
                    containerPort: {
                        type: 'Number'
                    },
                    protocol: {
                        type: 'String',
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
                            type: 'String'
                        },
                        value: {
                            type: 'String'
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
                            type: 'String'
                        },
                        valueFrom: {
                            type: 'String'
                        }
                    }
                ]
            },
            essential: {
                type: 'Boolean'
            },
            command: {
                type: 'String'
            },
            logDriver: {
                type: 'String'
            },
            logOptions: {
                default: undefined,
                type:
                    [
                        {
                            _id: false,
                            key: {
                                type: 'String'
                            },
                            value: {
                                type: 'String'
                            }
                        }
                    ]
            },
            readOnlyRoot: {
                type: 'Boolean'
            },
            resourceLimits: {
                default: undefined,
                type: [
                    {
                        _id: false,
                        limitName: {
                            type: 'String'
                        },
                        softLimit: {
                            type: 'String'
                        },
                        hardLimit: {
                            type: 'String'
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
                            type: 'String'
                        },
                        value: {
                            type: 'String'
                        }
                    }
                ]
            },
        }],
    },
    dnsSettings: 'Mixed',
    appCode: 'Mixed'

}, { _id: false });

environmentSchema.path('apps').discriminator(constants.applicationKinds.ecs, ecsApplicationDetailsSchema);

const s3WebsiteApplicationDetailsSchema = new Schema({
    subdomain: 'String',
    hostedZone: 'String',
    redirect: 'Boolean',
    indexDocument: 'String',
    errorDocument: 'String',
    acmCertificateArn: 'String'
}, { _id: false});
environmentSchema.path('apps').discriminator(constants.applicationKinds.s3Website, s3WebsiteApplicationDetailsSchema);

// TODO: 1) Initially had no idea how it would look like so I 
// created this schema, but now that it's clear, this schema should be replaced with EnvironmentSchema.
// 2) Also now that the environments are stored separately instead of an array, the properties of the environment schema
// should be pulled up to the root of the schema definition
const ApplicationSchema = new Schema({
    createdAt: {
        type: 'Date',
        default: Date.now
    },
    createdBy: {
        type: 'ObjectId'
    },
    activations: {
        type: [
            {
                _id: false,
                activatedAt: {
                    type: 'Date'
                },
                activatedBy: {
                    type: 'ObjectId',
                    ref: 'User'
                }
            }
        ],
        default: []
    },
    userId: {
        type: 'ObjectId'
    },
    fromVersion: {
        type: 'String',
        default: 0
    },
    version: {
        type: 'String',
        default: 0
    },
    accountId: {
        type: 'ObjectId'
    },
    environment: environmentSchema
});

// model methods
ApplicationSchema.methods.getEnvironmentsProvider = getEnvironmentsProvider;
ApplicationSchema.methods.getEnvironmentsBasicSettings = getEnvironmentsBasicSettings;
// model statics
ApplicationSchema.statics.getEnvironmentsSummary = getEnvironmentsSummary;
ApplicationSchema.statics.getEnvironmentProvider = getEnvironmentProvider;
ApplicationSchema.statics.getEnvironmentRegion = getEnvironmentRegion;
ApplicationSchema.statics.getEnvironmentVersionsSummary = getEnvironmentVersionsSummary;
ApplicationSchema.statics.getEnvironmentActivationHistory = getEnvironmentActivationHistory;
ApplicationSchema.statics.addApplication = addApplication;
ApplicationSchema.statics.updateActivation = updateActivation;
ApplicationSchema.statics.getEnvironmentApplication = getEnvironmentApplication;
ApplicationSchema.statics.createEnvironment = createEnvironment;
ApplicationSchema.statics.getApplicationByVersion = getApplicationByVersion;
ApplicationSchema.statics.getEnvironmentApplicationsSummary = getEnvironmentApplicationsSummary;


async function getEnvironmentsSummary(accountId) {
    try {
        const summary = await ApplicationModel.aggregate([
            {
              $lookup:
                {
                  from: "providers",
                  localField: "environment.provider",
                  foreignField: "_id",
                  as: "provider"
                }
            },
            {
                $match:{accountId: new ObjectId(accountId)}
            },
            { 
                $unwind : "$provider" 
            },
            {
                $group:{
                    _id: {
                        envName: '$environment.name',
                        providerName: '$provider.backend.name'
                    },
                    count: {$sum: 1},
                    versions: {
                        $push: {
                            version: "$version",
                            apps: 
                            {
                                "$map": {
                                    "input": "$environment.apps",
                                    "as": "apps",
                                    "in": {
                                        name: "$$apps.name",
                                        kind: "$$apps.kind"
                                    }
                                }
                            } 
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    envName: "$_id.envName",
                    providerName: "$_id.providerName",
                    count: 1,
                    versions: 1
                }
            }
            ]).exec();            
        console.log(`summary: ${JSON.stringify(summary)}`);
        return {
          success: true,
          output: {
            summary
          }
        };
      } catch (e) {
          console.error(e.message);
        return {
          success: false,
          message: e.message
        };
    }
}

async function getEnvironmentVersionsSummary(accountId, environmentName) {
    try {
        const summary = await ApplicationModel.aggregate([
            {
              $lookup:
                {
                  from: "providers",
                  localField: "environment.provider",
                  foreignField: "_id",
                  as: "provider"
                }
            },
            {
                $match:{accountId: new ObjectId(accountId), 'environment.name': environmentName}
            },
            { 
                $unwind : "$provider" 
            },
            {
                $group:{
                    _id: {
                        envName: '$environment.name',
                        providerName: '$provider.backend.name'
                    },
                    count: {$sum: 1},
                    versions: {
                        $push: {
                            version: "$version",
                            fromVersion: "$fromVersion",
                            apps: 
                            {
                                "$map": {
                                    "input": "$environment.apps",
                                    "as": "apps",
                                    "in": {
                                        name: "$$apps.name",
                                        kind: "$$apps.kind"
                                    }
                                }
                            } 
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    providerName: "$_id.providerName",
                    count: 1,
                    versions: 1
                }
            }
            ]).exec();            
        console.log(`summary: ${JSON.stringify(summary)}`);
        let result = {};
        if (summary.length > 0) {
            result = summary[0];
        }
        return {
          success: true,
          output: {
            summary: result
          }
        };
      } catch (e) {
          console.error(e.message);
        return {
          success: false,
          message: e.message
        };
    }
}
async function getEnvironmentActivationHistory(accountId, environmentName) {
    try {
        const result = await ApplicationModel.aggregate([
            {
                $match:{accountId: new ObjectId(accountId), 'environment.name': environmentName}
            },
            {
                $unwind: "$activations"
            },  
            {
                $lookup:
                {
                    from: "users",
                    localField: "activations.activatedBy",
                    foreignField: "_id",
                    as: "activations.activatedBy"
                }
            },
            {
                $unwind: "$activations.activatedBy"
            },
            {
                $project: {
                    _id: 0,
                    version: 1,
                    activatedAt: '$activations.activatedAt',
                    activatedBy: '$activations.activatedBy.email'
                }
            },
            {
                $sort: { activatedAt: -1 }
            }
            ]).exec();            
        return {
          success: true,
          output: {
            activations: result
          }
        };
      } catch (e) {
          console.error(e.message);
        return {
          success: false,
          message: e.message
        };
    }
}
async function getEnvironmentsProvider(accountId) {
    const envsSummary = await this.model(modelName).aggregate([
        {
            $match: {
                accountId: ObjectId(accountId)
            }
        },
        {
        $project: {
            '_id': 0, 'environment.name': 1, 'environment.providerName': 1
        }
    }]).exec();
    return (envsSummary && envsSummary[0] && envsSummary[0].environment) || [];
}
async function getEnvironmentsBasicSettings(accountId) {
    const envsSummary = await this.model(modelName).aggregate([
        {
            $match: {
                accountId: ObjectId(accountId)
            }
        },
        {
        $project: {
            '_id': 0, 'environment.name': 1, 'environment.region': 1, 'environment.providerName': 1
        }
    }]).exec();
    return (envsSummary && envsSummary[0] && envsSummary[0].environment) || [];
}

async function getApplicationByVersion(accountId, environmentName, version) {
    try {
        const filter = { accountId: new ObjectId(accountId), 'environment.name': environmentName, 'version': version }
        const application = await (await ApplicationModel.findOne(filter, { _id: 0, __v: 0})
        .populate({path: 'environment.provider', select: ['backend.name','backend.region','backend.bucketName','backend.dynamodbName','backend.kmsKeyId']}).exec());
        console.log(`application: ${JSON.stringify(application)}`);
        return {
          success: true,
          output: {
            application
          }
        };
      } catch (e) {
          console.error(e.message);
        return {
          success: false,
          message: e.message
        };
    }
}

// Find and application in environment with specific name and version and return its details
async function getEnvironmentApplication(accountId, environmentName, version, name) {
    try {
        console.log(`name: ${name}`);
        const result = await ApplicationModel.aggregate([
            { $lookup: { from: "providers", localField: "environment.provider", foreignField: "_id", as: "provider" } },
            { $match: { accountId: new ObjectId(accountId), 'environment.name': environmentName, 'version': version, 'environment.apps.name': name } },
            { $unwind: { path: '$environment.apps'} },
            { $match: {'environment.apps.name': {$eq: name} } },
            { $project: { app: '$environment.apps', instanceGroups: '$environment.instanceGroups', providerName: {$arrayElemAt: ['$provider.backend.name', 0]}}},
            { $replaceRoot: { newRoot: { $mergeObjects: [ "$app", "$$ROOT"] } } },
            { $project: { _id: 0, app:0 } }
        ]).exec();
        if (result.length) {
            return {
                success: true,
                output: {
                    app: result[0]
                }
            };
        }
        return {
            success: false,
            message: constants.errorMessages.models.elementNotFound
        };
      } catch (e) {
          console.error(e.message);
        return {
          success: false,
          message: e.message
        };
    }
}

async function getEnvironmentApplicationsSummary(accountId, environmentName, version) {
    try {
        const filter = { accountId: new ObjectId(accountId), 'environment.name': environmentName, 'version': version }
        const result = await ApplicationModel.findOne(filter, {_id: 1, 'createdBy': 1, 'createdAt': 1, 'environment.apps.name': 1, 'environment.apps.kind': 1, 'environment.apps.description': 1})
        .populate('environment.provider', 'backend.name').exec();
        // TODO: GET/populate the name of the user (createdBy in the dto to become an object: {name,id})
        if (result) {
            const apps = result.environment.apps.map(app => ({
                name: app.name,
                kind: app.kind,
                description: app.description
            }));
            return {
              success: true,
              output: {
                env: {
                    provider: result.environment.provider.backend.name,
                    createdBy: result.createdBy,
                    createdAt: result.createdAt,
                    apps
                }
              }
            };
        }
        return {
            success: false,
            message: constants.errorMessages.models.elementNotFound
        };
      } catch (e) {
          console.error(e.message);
        return {
          success: false,
          message: e.message
        };
    }
}

async function getEnvironmentProvider(accountId, environmentName, version) {
    try {
        const result = await (await ApplicationModel.aggregate([
            { $match: { accountId: new ObjectId(accountId), 'environment.name': environmentName, version: version }},
            { $lookup: { from: 'providers', localField: 'environment.provider', foreignField: '_id', as: 'provider'}},
            { $unwind: { path: '$provider'}},
            { $project: { _id: 0, providerName: '$provider.displayName', id: '$provider._id'} }
        ]).exec());
        if (result.length) {
            return {
                success: true,
                output: {
                    provider: result[0] // We know the relationship from application to provider is many to one
                }
            };
        }
        return {
            success: false,
            message: constants.errorMessages.models.elementNotFound
        };
      } catch (e) {
          console.error(e.message);
        return {
          success: false,
          message: e.message
        };
    }
}

async function getEnvironmentRegion(accountId, environmentName) {
    try {
        const filter = { accountId: new ObjectId(accountId), 'environment.name': environmentName }
        const result = await ApplicationModel.findOne(filter, {_id: 0, 'environment.region':1 });
        console.log(`result: ${JSON.stringify(result)}`);
        if (result && result.environment) {
            return {
                success: true,
                output: {
                    region: result.environment.region
                }
            };
        }
        return {
            success: false,
            message: constants.errorMessages.models.elementNotFound
        };
      } catch (e) {
          console.error(e.message);
        return {
          success: false,
          message: e.message
        };
    }
}

async function createEnvironment(data) {
    try {
        console.log(`createEnvironment: ${JSON.stringify(data)}`);
        const filter = { accountId: new ObjectId(data.accountId), 'environment.name': data.name }
        const count = await ApplicationModel.countDocuments(filter).exec();
        if (count != 0) {
            return {
                success: false,
                message: constants.errorMessages.models.duplicate
            }
        }
        let environmentData = {
            createdBy: data.userId,
            accountId: data.accountId, //TODO: Don't set this, it's derived
            environment: {
                name: data.name,
                description: data.description,
                region: data.region,
                provider: data.provider
            }
        };

        const environment = new this(environmentData);
        await environment.save();
        return {
            success: true
        };
    } catch (e) {
        console.error(`error:::` + e.message);
        return {
          success: false,
          message: e.message
        };
    }
}

async function addApplication(data) {
    try {
        console.log(`save data:${JSON.stringify(data, null, 2)}`);
        const filter = { accountId: new ObjectId(data.accountId), 'environment.name': data.environment.name }
        const count = await ApplicationModel.countDocuments(filter).exec();
        let versionedData = Object.assign({}, data, {fromVersion: data.version, version: count });
        const application = new this(versionedData);
        const saved  = await application.save();
        console.log(`saved: ${JSON.stringify(saved)}`);
        return {
          success: true,
          output: {
            version: saved.version
          }
        };
      } catch (e) {
        return {
          success: false,
          message: e.message
        };
    }
}

async function updateActivation(accountId, environmentName, version, activatedAt, activatedBy) {
    try {
        const filter = { accountId: new ObjectId(accountId), 'environment.name': environmentName, version: version }
        console.log(`filter: ${JSON.stringify(filter)}`);
        const activation = {
            activatedAt,
            activatedBy: new ObjectId(activatedBy)
        };
        const doc = await ApplicationModel.findOneAndUpdate(filter, {$push: {activations : activation} }).exec();
        console.log(`doc: ${JSON.stringify(doc.toJSON())}`);
        return {
          success: true
        };
      } catch (e) {
        return {
          success: false,
          message: e.message
        };
    }
}





const ApplicationModel = mongoose.model(modelName, ApplicationSchema);
module.exports = ApplicationModel;
