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
    default: uuid,
    required: true
  },
  display_name: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    required: true
  },
  min_size: {
    type: Number,
    default: 0,
    required: true
  },
  max_size: {
    type: Number,
    required: true
  },
  instances: {
    type: [{
      _id: false,
      instance_type: String,
      weighted_capacity: Number
    }],
    required: true,
    default: []
  },
  root_volume_size: {
    type: Number,
    default: 100, // no reason for choosing this value!
    required: true
  },
  key_pair_name: {
    type: String,
    default: ""
  },
  labels: {
    type: [String],
    default: []
  },
  is_spot: {
    type: Boolean,
    default: false
  }
});


const classicBakedApplicationSchema = new Schema({
  alb_exposed_ports: {
    alb_display_name: {
      type: String,
      required: true
    },
    ports: {
      type: [{
        _id: false,
        load_balancer_port: {
          type: Number,
          required: true
        },
        host_port: {
          type: Number,
          required: true
        },
        dns_prefix: {
          type: String,
          required: true
        },
        healthy_threshold: {
          type: String,
          default: 5
        },
        unhealthy_threshold: {
          type: String,
          default: 2
        },
        interval: {
          type: String,
          default: 30
        },
        matcher: {
          type: String,
          default: '200-299'
        },
        path: {
          type: String,
          default: '/'
        },
        timeout: {
          type: String,
          default: 5
        }
      }],
      default: []
    }
  },
  nlb_exposed_ports: {
    nlb_display_name: {
      type: String,
      required: true
    },
    ports: {
      type: [{
        _id: false,
        port_number: {
          type: Number,
          required: true
        },
        protocol: {
          type: String,
          required: true
        },
        certificate_arn: {
          type: String,
          default: ''
        },
        dns_prefix: {
          type: String,
          required: true
        },
        healthy_threshold: {
          type: String,
          default: 3
        },
        unhealthy_threshold: {
          type: String,
          default: 3
        },
        interval: {
          type: String,
          default: 30
        }
      }],
      default: []
    }
  },
  instance_iam_role: {
    type: String,
    default: ""
  },
  image_id: {
    type: String,
    required: true
  },
  base64encoded_user_data: {
    type: String,
    default: null
  },
  instance_groups: {
    type: [
      InstanceGroupSchema
    ],
    default: []
  }
}, { toJSON: { virtuals: true } });

module.exports = ApplicationVersion.discriminator(constants.applicationKinds.classicBaked + '_v3', classicBakedApplicationSchema, constants.applicationKinds.classicBaked);