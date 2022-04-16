const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId;
const Schema = mongoose.Schema;

const modelName = 'applications_v3';
const applicationSchema = new Schema({
    environment: {
        type: ObjectId,
        ref: 'environment_v2'
    },
    name: String,
    jobName: String,
    repositoryUrl: String,
    integrationName: String,
    description: String,
    kind: String, // This field is repeated in the applicationVersion schema! is it the best way?!!
    activeVersion: Number,
    deployedVersion: Number,
    releaseName: String,
    versions: {
        type: [{
            type: ObjectId,
            ref: 'application_version_v3'
        }],
        default: []
    },
    variableValues: {   //TODO: Get rid of this, it's to be replaced by a dataBag 
        type: [
            {
                _id: false,
                name: 'String',
                currentValue: 'String'
            }
        ],
        default: []
    },
    deployedAt: {
        type: Number
    },
    deployedBy: {
        type: ObjectId,
        ref: 'User'
    },
    destroyedAt: {
        type: Number
    },
    destroyedBy: {
        type: ObjectId,
        ref: 'User'
    },
    activatedAt: {
        type: Number
    },
    activatedBy: {
        type: ObjectId,
        ref: 'User'
    },
    /*
  created: the application is created for the first time (only once in the application's lifetime)
  deploying: for the application in created state, deploy action puts it in deploying state
  deployed: a successful deploy action moves the application from deploying state to deployed state
  deploy_failed: an unsuccessful deploy action moves the application from deploying state to failed state
  destroying: for the application in created state, destroy action puts it in destroying state
  destroyed: a successful destroy action moves the application from destroying state to destroyed state
  destroy_failed: an unsuccessful destroy action moves the application from destroying state to failed state
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
    jenkinsState: {
      type: {
          _id: false,
          code: String
      },
      default: {
        code: 'created' // We don't provide reason for the state code ⏩created⏪
      }
    },
    isDynamicApplication: {
        type: Boolean,
        default: false
    },
    buildHistory: {
        type: [{
            _id: false,
            duration: Number,
            commit: String,
            author: String,
            email: String,
            result: String,
            startedAt: Number
        }],
        default: []
    },
    dynamicNames: {
        type: [{
            name: String,
            stateCode: String,
            jobName: String,
            state: {
              type: {
                  _id: false,
                  code: {
                      code: String
                  },
                  job: String
              },
              default: {
                  code: 'created'
              }
            },
            jenkinsState: {
              type: {
                  _id: false,
                  code: String
              },
              default: {
                code: 'created' // We don't provide reason for the state code ⏩created⏪
              }
            },
            deployedVersion: Number
        }]
    } 
}, { toJSON: { virtuals: true } });

// indices
applicationSchema.index({ environment: 1, name: 1 }, { unique: true });
applicationSchema.virtual('job', {
    ref: 'Job',
    localField: 'state.job',
    foreignField: 'jobId',
    select: 'jobId',
    justOne: true
});

module.exports = mongoose.model(modelName, applicationSchema);
