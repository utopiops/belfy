const mongoose = require('mongoose'),
  Schema = mongoose.Schema;
const uuidv4 = require('uuid/v4');
const constants = require('../../utils/constants');
const config = require('../../utils/config').config;
const timeService = require('../../services/time.service');
const ObjectId = require('mongoose').Types.ObjectId;
const HttpService = require('../../utils/http/index');
const http = new HttpService();
const { defaultLogger: logger } = require('../../logger')

const modelName = 'Job';
const DEFAULT_DEADLINE_SECONDS = 60 * 20; // 20 minutes
const DEFAULT_MAX_RETRIES = 3;

const JobSchema = new Schema({
  userId: {
    type: ObjectId,
    required: true
  },
  accountId: { // TODO: populate this whenever needed (derived property)
    type: 'ObjectId',
    required: true
  },
  jobId: {
    type: 'String',
    required: true,
    default: uuidv4
  },
  /*
  valid values:
    created,
    processing,
    failed,
    complete,
    timeout
  
  valid transitions: 
    created -> processing, timeout
    processing -> failed, complete, timeout
    complete -> processing
    failed -> any
    timeout -> any
  */
  status: {
    type: String,
    required: true,
    default: constants.jobStats.created
  },
  path: {
    type: 'String',
    required: true
  },
  startTime: {
    type: 'Date',
    required: true,
    default: Date.now
  },
  dataBag: {
    type: 'Mixed',
    default: {}
  },
  title: String,
  deadline: {
    type: Number,
    default: () => timeService.secondsAfterNow(DEFAULT_DEADLINE_SECONDS) // 20 minutes by default
  },
  maximumAttempts: {
    type: Number,
    required: true,
    default: DEFAULT_MAX_RETRIES
  },
  attempts: {
    type: Number,
    required: true,
    default: 0
  },
}, { timestamps: true });



JobSchema.methods.addJob = addJob;
JobSchema.methods.updateJobStatus = updateJobStatus;
JobSchema.methods.getJobStatus = getJobStatus;
JobSchema.methods.getActiveJobsForPath = getActiveJobsForPath;
JobSchema.methods.getActiveJobs = getActiveJobs;
JobSchema.methods.sendJobNotification = sendJobNotification;

async function addJob(data) {
  try {
    const job = new JobModel(data);
    const saved = await job.save();
    return {
      success: true,
      output: {
        jobId: saved.jobId
      }
    };
  } catch (e) {
    return {
      success: false,
      message: e.message
    };
  }
}

async function updateJobStatus(accountId, jobId, status) {
  // valid transitions: 
  //   created -> processing, timeout
  //   processing -> failed, complete, timeout
  let filter = { accountId, jobId };
  if ([constants.jobStatus.timeout, constants.jobStatus.failed].indexOf(status) == -1) {
    filter.deadline = { $gte: timeService.now() }; // You cannot update the status of the job it it's already timed out unless the new status is timeout or failed
  }
  let update = { status };
  switch (status) {
    case constants.jobStatus.timeout:
    case constants.jobStatus.failed:
      break;
    case constants.jobStatus.complete:
      filter.status = constants.jobStatus.processing;
      break;
    case constants.jobStatus.processing:
      filter['$or'] = [{
        status: constants.jobStatus.created,
        attempts: 0
      },
      {
        status: constants.jobStatus.processing,
        attempts: { $lt: DEFAULT_MAX_RETRIES },
      }
      ];
      update['$inc'] = { attempts: 1 };
      break;
    default:
      return {
        success: false,
        error: {
          status: 400,
          message: 'Invalid state provided'
        }
      }
  }
  try {
    const job = await JobModel.findOneAndUpdate(filter, update, { new: true }).exec();
    if (!job) {
      return {
        success: false,
        error: {
          status: 400,
          message: 'The job\'s state could not be updated'
        }
      }
    }
    return {
      success: true
    };
  } catch (e) {
    console.log(`e:`, e.message);
    return {
      success: false,
      message: e.message
    };
  }
}

async function getJobStatus(accountId, jobId) {
  try {
    const filter = { accountId, jobId };
    const status = await JobModel.findOne(filter, { _id: 0, status: 1 }).exec();
    return {
      success: true,
      output: {
        status
      }
    };
  } catch (e) {
    return {
      success: false,
      message: e.message
    };
  }
}

async function getActiveJobsForPath(accountId, path) {
  try {
    const filter = { accountId, path, status: { $ne: constants.jobStats.complete } };
    const jobs = await JobModel.find(filter, { _id: 0, jobId: 1, status: 1 }).exec();
    return {
      success: true,
      output: {
        jobs
      }
    };
  } catch (e) {
    return {
      success: false,
      message: e.message
    };
  }
}
async function getActiveJobs(accountId) {
  try {
    const filter = { accountId, status: { $ne: constants.jobStats.complete }, deadline: { $gte: timeService.now() } };
    const jobs = await JobModel.find(filter, { _id: 0, jobId: 1, status: 1, deadline: 1, path: 1, dataBag: 1, userId: 1 }).exec();
    return {
      success: true,
      output: {
        jobs: [
          ...jobs.map(j => {
            return {
              jobPath: j.path,
              status: j.status,
              jobId: j.jobId,
              environmentName: j.dataBag.environmentName,
              applicationName: j.dataBag.applicationName,
              dbsName: j.dataBag.dbsName,
              tfModuleName: j.dataBag.tfModuleName,
              identifier: j.dataBag.identifier 
            }
          })
        ]
      }
    };
  } catch (e) {
    console.error(`error:`, e.message);
    return {
      success: false,
      message: e.message
    };
  }
}

async function sendJobNotification(jobNotification, httpConfigs) {
  try {
    const url = `${config.nightingaleUrl}/notification`
    await http.post(url, jobNotification, httpConfigs);
    logger.info(`Job notification was sent`)
    return
  } catch (e) {
    logger.error(`Failed to send job notification: ${e}`)
    return
  }
}

const JobModel = mongoose.model(modelName, JobSchema);

module.exports = JobModel;
