// Note: this file contains the entities to support the applications v2. It includes environments and the applications.
const constants = require('../../../utils/constants');
const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const Schema = mongoose.Schema;
const timeService = require('../../../services/time.service');
const EnvironmentVersion = require('./environmentVersion');
const awsEnvironmentSchema = require('./awsEnvironment');
const azureEnvironmentSchema = require('./azureEnvironment');
const gcpEnvironmentSchema = require('./gcpEnvironment');

const modelName = 'environment_v2';
const environmentSchema = new Schema({
  tfCodePath: String, // Not used yet, assign the generated TF path on S3
  tfVersion: {
    type: String,
    default: '1.0.4', // At the moment this is the only supported value and should not accept it from the user
    required: true
  },
  accountId: {
    type: ObjectId,
    ref: 'Account',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  provider: {
    type: ObjectId,
    ref: 'Provider',
    required: true
  },
  providerName: {
    type: String,
    required: true
  },
  kind: {
    type: String,
    required: true
  },
  region: {
    type: String,
  },
  location: { // this is for azure environment
    type: String,
  },
  description: String,
  createdBy: {
    type: ObjectId,
    ref: 'User'
  },
  deployedAt: Number,
  activeVersion: Number,
  deployedVersion: Number,
  deployedBy: {
    type: ObjectId,
    ref: 'User'
  },
  domain: {
    dns: String,
    create: {
      type: Boolean,
      default: true
    }
  },
  hostedZone: {
    name: String, // TODO: Get rid of this
    parentDomain: String,
    isOwn: Boolean,
    isCrossAccount: Boolean
  },
  dns: { // This is for azure and gcp environment
    is_own: Boolean,
    is_cross_account: Boolean,
    parent_domain: String
  },
  isNsVerified: {
    type: Boolean,
    default: false
  },
  // todo: add validation. Valid values: ⏩[created, changed, deploying, modifying, done]⏪
  /*
  created: the environment is created for the first time (only once in the environment's lifetime)
  changed: the environment is already deployed, it's now changed (the change yet to be deployed) (happens with every change)
  deploying: for the environment in created state, deploy action puts it in deploying state (only once in the environment's lifetime)
  modifying: for the environment in changed state, deploy action puts it in modifying state (happens with every change)
  deployed: a successful deploy action moves the environment from created/changed state to deployed state (happens with every change/first time creation)
  failed: an unsuccessful deploy action moves the environment from created/changed state to failed state (happens with every change/first time creation)
  destroying: for the environment in deployed state, destroy action puts it in destroying state
  destroyed: a successful destroy action moves the environment from destroying state to destroyed state
  */
  state: {
    type: {
      _id: false,
      code: {
        code: String
      },
      job: String
    },
    default: {
      code: 'created' // We don't provide reason for the state code ⏩created⏪
    }
  },
  versions: [EnvironmentVersion]
}, { timestamps: true });

environmentSchema.index({ accountId: 1, name: 1 }, { unique: true });
environmentSchema.path('versions').discriminator(constants.applicationProviders.aws, awsEnvironmentSchema);
environmentSchema.path('versions').discriminator(constants.applicationProviders.azure, azureEnvironmentSchema);
environmentSchema.path('versions').discriminator(constants.applicationProviders.gcp, gcpEnvironmentSchema);

module.exports = mongoose.model(modelName, environmentSchema);
