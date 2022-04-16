const { Schema } = require('mongoose');
const KubernetesClusterVersion = require('./kubernetesClusterVersion');

const instanceGroupsTagsSchema = new Schema({
  _id: false,
  type: Object,
  default: {}
}, { minimize: false })

const eksDetailsSchema = new Schema({
  eks_cluster_name: {
    type: String,
    required: true
  },
	eks_version: {
		type: String,
		default: "1.21"
	},
	eks_endpoint_private_access: {
		type: Boolean,
    default: true
	},
	eks_public_access: {
		type: Boolean,
		default: true
	},
	eks_enabled_cluster_log_types: {
		type: [String],
		default: ["api", "audit", "authenticator", "controllerManager", "scheduler"]
	},
  eks_logs_retention_in_days: {
    type: Number,
    default: 7
  },
  worker_launch_template: {
    type: {
      root_volume_size: String,
      image_id: String
    },
    default: null
  },
  instance_groups: {
    type: [{
      _id: false,
      name: {
        type: String,
        required: true
      },
      capacity_type: {
        type: String,
        required: true
      },
      instance_types: {
        type: Array,
        required: true
      },
      disk_size: {
        type: Number,
        required: true
      },
      desired_size: {
        type: Number,
        required: true
      },
      max_size: {
        type: Number,
        required: true
      },
      min_size: {
        type: Number,
        required: true
      },
      tags: {
        type: instanceGroupsTagsSchema,
        required: true
      },
    }],
    required: true
  },
	fargate_profiles: {
		type: [{
      _id: false,
      name: {
        type: String,
        required: true
      },
      namespace: {
        type: String,
        required: true
      },
      labels: {
        type: Object,
        required: true
      }
    }],
		default: []
	},
	eks_worker_assume_role_arns: {
		type: Array,
		default: []
	},
	tags: {
		type: Object,
		default: {}
	}
});

module.exports = KubernetesClusterVersion.discriminator('eks', eksDetailsSchema);
