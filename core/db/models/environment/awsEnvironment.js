const { Schema } = require('mongoose');

const InstanceGroupSchema = new Schema({
  _id: false,
  kind: String,
  name: String, // todo: add validation to make it unique per cluster
  displayName: String,
  count: Number,
  minSize: Number,
  maxSize: Number,
  instances: {
    type: [
      {
        instanceType: String,
        weightedCapacity: Number
      }
    ],
    default: []
  },
  rootVolumeSize: Number,
  keyPairName: {
    type: String,
    default: ""
  },
  labels: {
    type: [String],
    default: []
  },
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
      is_internal: {
        type: Boolean,
        default: false
      },
      listenerRules: { // Add validation 
        type: [{
          port: Number,
          protocol: {
            type: String,
            default: "HTTP"
          },
          certificateArn: {
            type: String,
            default: ""
          }
        }],
        default: []
      },
      enable_waf: {
        type: Boolean,
        default: false
      }
    }],
    default: []
  },
  alb_waf: {
    type: {
      rate_limit: Number,
      managed_rules: [String]
    },
    default: null
  },
  nlbList: { // NOTE: the NLB listeners cannot be shared so we add them as part of the applications using them.
    type: [{ // TODO: Make sure the same nlb listener is not used by multiple applications
      name: String, // should not change, should be unique per environment
      displayName: String,// should not change, should be unique per environment. TODO: Use this instead of name
      is_internal: {
        type: Boolean,
        default: true
      }
    }],
    default: []
  },
  ecsClusterList: {
    type: [{
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
  start_schedule: {
    type: String
  },
  stop_schedule: {
    type: String
  }
}, { _id: false });

module.exports = awsEnvironmentSchema;
