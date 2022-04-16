const { Schema } = require('mongoose');

const constants = require('../../../utils/constants');
const environmentModel = require('./environment');
const ObjectId = require('mongoose').Types.ObjectId;
const metricModel = require('../environment_metric/environmentMetricProvider');

const InstanceGroupSchema = new Schema({
  _id: false,
  kind: String,
  name: String, // todo: add validation to make it unique per cluster
  displayName: String, // todo: add validation to make it unique per cluster
  count: Number,
  instanceType: String,
  rootVolumeSize: Number,
  keyPairName: String,
  labels: [String],
  isSpot: {
    type: Boolean,
    default: false
  }
});


// AWS Environment schema
const awsEnvironmentSchema = new Schema({
  albList: {
    type: [{
      name: String, // should not change, should be unique per environment
      displayName: String, // should not change, should be unique per environment. TODO: Use this instead of name
      isInternal: {
        type: Boolean,
        default: false
      },
      listenerRules: { // Add validation 
        type: [{
          port: Number,
          protocol: String,
          certificateArn: String
        }],
        default: []
      }
    }],
    default: []
  },
  nlbList: { // NOTE: the NLB listeners cannot be shared so we add them as part of the applications using them.
    type: [{ // TODO: Make sure the same nlb listener is not used by multiple applications
      name: String, // should not change, should be unique per environment
      displayName: String,// should not change, should be unique per environment. TODO: Use this instead of name
      isInternal: {
        type: Boolean,
        default: true
      }
    }],
    default: []
  },
  ecsClusterList: {
    type: [{
      dependencies: {
        rds: { // Kept for backwards compatibility. TODO: delete when it's safe
          type: [
            {
              _id: false,
              name: String
            }
          ],
          default: []
        },
        rdsNames: {
          type: [String],
          default: []
        },
        albName: String
      },
      name: String,
      displayName: String,
      instanceGroups: {
        type: [
          InstanceGroupSchema
        ],
        default: []
      }
    }],
    default: []
  },
  hostedZone: {
    name: String,
    isOwn: Boolean,
    isCrossAccount: Boolean
  }
  /*
  classicInstanceGroups: [
    ....
  ]
  */
});

/// statics

// Creates an aws environment
awsEnvironmentSchema.statics.add = addAwsEnvironment;

// Pushes the ALB name to the albList of the environment
awsEnvironmentSchema.statics.addAlb = addAlb;

// Pulls the ALB from the albList of the environment
awsEnvironmentSchema.statics.deleteAlb = deleteAlb;

// Pushes the NLB name to the nlbList of the environment
awsEnvironmentSchema.statics.addNlb = addNlb;

// Pulls the NLB from the nlbList of the environment
awsEnvironmentSchema.statics.deleteNlb = deleteNlb;

// Adds a listener to the alb
awsEnvironmentSchema.statics.addListenerToAlb = addListenerToAlb;

// Delete listener from the environment ALB
awsEnvironmentSchema.statics.deleteAlbListener = deleteAlbListener;

// Add listener to the environment ALB
awsEnvironmentSchema.statics.updateAlbListenerCertificate = updateAlbListenerCertificate;

// Shows the names of all the ALBs in an environment
awsEnvironmentSchema.statics.listAlbs = listAlbs;

// Pushes the ECS cluster name to the ecsClusterList of the environment
awsEnvironmentSchema.statics.addEcsCluster = addEcsCluster;

// Adds an ECS instance group to the instance groups of the cluster
awsEnvironmentSchema.statics.addEcsInstanceGroup = addEcsInstanceGroup;

// Deletes an ECS  cluster
awsEnvironmentSchema.statics.deleteEcsCluster = deleteEcsCluster;

// Deletes an ECS instance group from the instance groups of the cluster
awsEnvironmentSchema.statics.deleteEcsInstanceGroup = deleteEcsInstanceGroup;

// Shows the names and displayNames of all the ECS clusters in an environment
awsEnvironmentSchema.statics.listEcsClusters = listEcsClusters;

// Updates the dependencies of the cluster
awsEnvironmentSchema.statics.updateEcsClusterDependencies = updateEcsClusterDependencies;

// Gets the list of environments to which we can add a certificate and validation records
awsEnvironmentSchema.statics.listEnvironmentsWithHostedZone = listEnvironmentsWithHostedZone;



async function addAwsEnvironment(data) {
  try {
    const { name, region, description, accountId, tfCodePath, providerId, parentHostedZoneName, isOwn, isCrossAccount, userId } = data;

    const hostedZone = {
      name: isOwn ? `${name}.${parentHostedZoneName}` : parentHostedZoneName,
      isOwn,
      isCrossAccount
    };

    const env = {
      accountId,
      createdBy: data.userId,
      hostedZone,
      name,
      region,
      description,
      tfCodePath,
      provider: ObjectId(providerId)
    }
    const awsEnv = new this(env);
    await awsEnv.save();

    const environmentId = awsEnv._id;
    // todo: handle if this fails (maybe rollback ?!)
    await metricModel.addProviderCloudWatch(environmentId, userId);

    return {
      success: true
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
//-------------------------------------------------------------
async function addAlb(accountId, environmentName, albName, displayName) {
  try {
    console.log(`albName: ${albName}`);
    const filter = { accountId: new ObjectId(accountId), 'name': environmentName, };
    const update = {
      '$push':
      {
        'albList': {
          name: albName,
          displayName
        }
      },
      status: {
        code: 'changed',
        reason: {
          operation: 'create',
          resource: `alb:${displayName}`
        }
      }
    };
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
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}
//-------------------------------------------------------------
async function deleteAlb(accountId, environmentName, albDisplayName) {
  try {
    const filter = { accountId: new ObjectId(accountId), name: environmentName }
    const update = {
      '$pull': { 'albList': { displayName: albDisplayName } },
      '$set': {
        status: {
          code: 'changed',
          reason: {
            operation: 'delete',
            resource: `alb:${albDisplayName}`
          }
        }
      }
    };
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
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}
//-------------------------------------------------------------
async function addNlb(accountId, environmentName, nlbName, displayName, isInternal) {
  try {
    console.log(`nlbName: ${nlbName}`);
    const filter = { accountId: new ObjectId(accountId), 'name': environmentName, };
    const update = {
      '$push':
      {
        'nlbList': {
          name: nlbName,
          displayName,
          isInternal
        }
      },
      status: {
        code: 'changed',
        reason: {
          operation: 'create',
          resource: `nlb:${nlbName}`
        }
      }
    };
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
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}
//-------------------------------------------------------------
async function deleteNlb(accountId, environmentName, nlbDisplayName) {
  try {
    const filter = { accountId: new ObjectId(accountId), name: environmentName }
    const update = {
      '$pull': { 'nlbList': { displayName: nlbDisplayName } },
      '$set': {
        status: {
          code: 'changed',
          reason: {
            operation: 'delete',
            resource: `nlb:${nlbDisplayName}`
          }
        }
      }
    };
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
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}
//-------------------------------------------------------------
async function addListenerToAlb(accountId, environmentName, albName, port, protocol, certificateArn) {
  try {
    const filter = { accountId: new ObjectId(accountId), name: environmentName, albList: { $elemMatch: { name: albName, 'listenerRules.port': { '$ne': port } } } }
    const listener = {
      port,
      protocol,
      certificateArn
    };
    const update = {
      '$push': { 'albList.$.listenerRules': listener },
      status: {
        code: 'changed',
        reason: {
          operation: 'update',
          resource: `alb:${albName}`
        }
      }
    };
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
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}
//-------------------------------------------------------------
async function deleteAlbListener(accountId, environmentName, albDisplayName, port) {
  try {
    const filter = { accountId: new ObjectId(accountId), name: environmentName, albList: { $elemMatch: { displayName: albDisplayName } } }
    const update = {
      '$pull': { 'albList.$[].listenerRules': { port } },
      '$set': {
        status: {
          code: 'changed',
          reason: {
            operation: 'update',
            resource: `alb:${albDisplayName}`
          }
        }
      }
    };
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
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}
//-------------------------------------------------------------
async function updateAlbListenerCertificate(accountId, environmentName, albName, port, certificateArn) {
  console.log(`certificateArn`, certificateArn);
  try {
    const filter = {
      accountId: new ObjectId(accountId),
      name: environmentName,
      'albList.name': albName,
      'albList.listenerRules.protocol': 'https',
      'albList.listenerRules.port': port
    };
    let doc = await this.findOneAndUpdate(filter,
      {
        $set: { 'albList.$[alb].listenerRules.$[rule].certificateArn': certificateArn },
        status: {
          code: 'changed',
          reason: {
            operation: 'update',
            resource: `alb:${albName}>listener:${port}`
          }
        }
      },
      { arrayFilters: [{ "alb.name": albName }, { 'rule.protocol': 'https', 'rule.port': port }], multi: false }).exec();
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
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}
//-------------------------------------------------------------
async function listAlbs(accountId, environmentName) {
  try {
    const filter = { accountId: new ObjectId(accountId), 'name': environmentName }
    const result = await this.findOne(filter, { _id: 0, albList: 1 }).exec();
    if (result == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true,
      output: {
        albList: result.albList
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
//-------------------------------------------------------------
async function addEcsCluster(accountId, environmentName, cluster) {
  try {
    const filter = { accountId: new ObjectId(accountId), name: environmentName };
    const update = {
      '$push':
      {
        'ecsClusterList': cluster
      },
      '$set': {
        status: {
          code: 'changed',
          reason: {
            operation: 'create',
            resource: `ecs_cluster:${cluster.displayName}`
          }
        }
      }
    };
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
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}
//-------------------------------------------------------------
async function addEcsInstanceGroup(accountId, environmentName, clusterName, instanceGroup) {
  try {
    const filter = { accountId: new ObjectId(accountId), name: environmentName, ecsClusterList: { $elemMatch: { name: clusterName } } }
    const update = {
      '$push': { 'ecsClusterList.$.instanceGroups': instanceGroup },
      status: {
        code: 'changed',
        reason: {
          operation: 'update',
          resource: `ecs_cluster:${clusterName}`
        }
      }
    };
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
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}
//-------------------------------------------------------------
async function deleteEcsCluster(accountId, environmentName, clusterName) {
  try {
    const filter = { accountId: new ObjectId(accountId), name: environmentName }
    const update = {
      '$pull': { 'ecsClusterList': { displayName: clusterName } },
      '$set': {
        status: {
          code: 'changed',
          reason: {
            operation: 'delete',
            resource: `ecs_cluster:${clusterName}`
          }
        }
      }
    };
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
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}
//-------------------------------------------------------------
async function deleteEcsInstanceGroup(accountId, environmentName, clusterName, igName) {
  try {
    const filter = { accountId: new ObjectId(accountId), name: environmentName, ecsClusterList: { $elemMatch: { displayName: clusterName } } }
    const update = {
      '$pull': { 'ecsClusterList.$[].instanceGroups': { name: igName } },
      '$set': {
        status: {
          code: 'changed',
          reason: {
            operation: 'update',
            resource: `ecs_cluster:${clusterName}`
          }
        }
      }
    };
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
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}
//-------------------------------------------------------------
async function listEcsClusters(accountId, environmentName) {
  try {
    const filter = { accountId: new ObjectId(accountId), 'name': environmentName }
    const result = await this.findOne(filter, { '_id': 0, ecsClusterList: 1 }).exec();

    if (result == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound
      };
    }
    return {
      success: true,
      output: {
        ecsClusterList: result.ecsClusterList
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
//-------------------------------------------------------------
async function updateEcsClusterDependencies(accountId, environmentName, clusterName, dependencies) {
  try {
    const filter = { accountId: new ObjectId(accountId), name: environmentName, ecsClusterList: { $elemMatch: { displayName: clusterName } } }
    const update = {
      '$set': {
        'ecsClusterList.$.dependencies': dependencies,
        status: {
          code: 'changed',
          reason: {
            operation: 'update',
            resource: `ecs_cluster:${clusterName}`
          }
        }
      },
    };

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
    if (err.code && err.code === 11000) {
      message = constants.errorMessages.models.duplicate;
    }
    return {
      success: false,
      message: message
    };
  }
}
//-------------------------------------------------------------
async function listEnvironmentsWithHostedZone(accountId) {
  try {
    const filter = { accountId: new ObjectId(accountId), '$or': [{ 'hostedZone.isOwn': true }, { 'hostedZone.isCrossAccount': false }] }
    const environments = await this.find(filter, { '_id': 0, hostedZone: 1, name: 1 }).exec();
    console.log(`environments`, JSON.stringify(environments));
    return {
      success: true,
      output: {
        environments: environments.map(e => ({
          name: e.name,
          domainName: e.hostedZone.name
        }))
      }
    };
  } catch (err) {
    console.error(`error`, err.message);
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

const awsEnvironmentModel = environmentModel.discriminator(constants.applicationProviders.aws, awsEnvironmentSchema);
module.exports = awsEnvironmentModel;
