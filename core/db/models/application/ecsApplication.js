const { Schema } = require('mongoose');
const ApplicationVersion = require('./applicationVersion');
const constants = require('../../../utils/constants');

const ecsApplicationDetailsSchema = new Schema({
    ecs_cluster_name: {
      type: String,
      required: true
    },
    service_desired_count: {
      type: Number,
      default: 1,
      required: true
    },
    networkMode: {
      type: String,
      default: null
    },
    memory: {
      type: Number,
      default: null
    },
    cpu: {
      type: Number,
      default: null
    },
    task_role_arn: {
      type: String,
      default: null
    },
    exposed_container_name: {
      type: String,
    },
    exposed_container_port: {
      type: Number,
    },
    alb_name: {
      type: String,
    },
    alb_listener_port: {
      type: Number,
    },
    protocol: {
      type: String,
      default: null
    },
    certificate_arn: {
      type: String,
      default: null
    },
    should_set_dns: {
      type: Boolean,
      default: false
    },
    health_check_path: {
      type: String,
      default: '/'
    },
    matcher: {
      type: String,
      default: '200-299'
    },
    deployment_minimum_healthy_percent: {
      type: Number,
      default: 50
    },
    healthy_threshold: {
      type: Number,
      default: 5
    },
    unhealthy_threshold: {
      type: Number,
      default: 2
    },
    interval: {
      type: Number,
      default: 30
    },
    timeout: {
      type: Number,
      default: 5
    },
    service_autoscaling: {
      type: {
        min_capacity: Number,
        max_capacity: Number,
        metric_to_track: String,
        target_value: Number
      },
      default: null
    },
    containers: [{
      _id: false,
      name: {
        type: String,
        required: true
      },
      is_essential: {
        type: Boolean,
        default: true
      },
      image: {
        type: String,
        default: ""
      },
      ports: {
        _id: false,
        type: [
          {
            containerPort: {
              type: Number,
              required: true,
            },
            hostPort: {
              type: Number,
              default: 0,
            },
          },
        ],
      },
      containerPort: {
        type: Number,
      },
      hostPort: {
        type: Number,
      },
      cpu: {
        type: Number,
        required: true
      },
      memory: {
        type: Number,
        required: true
      },
      memoryReservation: {
        type: Number,
        required: true
      },
      retentionInDays: {
        type: Number,
        default: 1
      },
      environmentVariables: {
        default: [],
        type: [
          {
            _id: false,
            name: {
              type: String,
              required: true
            },
            value: {
              type: String,
              required: true
            }
          }
        ]
      }
    }],  
    exposed_ports: {
      default: [],
      type: [
        {
          domain_suffix: {
            type: String,
            deafult: "",
            // required: true, // todo: turn it required when single port deleted
          },
          exposed_container_name: {
            type: String,
            required: true,
          },
          exposed_container_port: {
            type: String,
            required: true,
          },
          alb_name: {
            type: String,
            required: true,
          },
          alb_listener_port: {
            type: Number,
            required: true,
          },
          health_check_path: {
            type: String,
            default: '/health',
          },
          protocol_version: {
            type: String,
            default: "HTTP1"
          },
          healthy_threshold: {
            type: Number,
            default: 3,
          },
          unhealthy_threshold: {
            type: Number,
            default: 3,
          },
          interval: {
            type: Number,
            default: 30,
          },
          timeout: {
            type: Number,
            default: 5,
          },
          matcher: {
            type: String,
            default: '200-299',
          },
          cookie_duration: {
            type: Number,
            default: 0,
          },
          certificate_arn: {
            type: String,
            default: '',
          },
          health_check_grace_period_seconds: {
            type: Number,
            default: 20,
          },
          deployment_minimum_healthy_percent: {
            type: Number,
            default: 50,
          },
        },
      ],
    },
    repositoryUrl: { // todo: remove repositoryUrl and integrationName from here and fix where they are used
      type: String,
    },
    integrationName: {
      type: String,
    },
    branch: {
      type: String,
      default: 'main'
    },
    jobName: {
      type: String,
    } 
}, { toJSON: { virtuals: true } });

module.exports = ApplicationVersion.discriminator(constants.applicationKinds.ecs + '_v3', ecsApplicationDetailsSchema, constants.applicationKinds.ecs);