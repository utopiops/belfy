const constants = require('../../utils/constants');
const tokenService = require('../../utils/auth/tokenService');
const Job = require('../../db/models/job');


exports.addJob = async (req, res, next) => {
  const accountId = res.locals.accountId;
  const userId = res.locals.userId;
  const dto = req.body;
  // TODO: Add validation
  if (!dto) {
    res.sendStatus(constants.statusCodes.ue);
  }
  const jobDetails = {
    accountId,
    userId,
    path: dto.path,
    ...(dto.title ? { title: dto.title } : {}), // Adding support for title to be used in the portal instead of the jobId.
    ...(dto.deadline ? { deadline: dto.deadline } : {}) // Adding support for the deadline in job. A job should not be processed after deadline.
  };

  const job = new Job();
  const result = await job.addJob(jobDetails);
  if (result.success) {
    res.send(result.output.jobId);
  } else { // TODO: implement the validation failure case
    res.sendStatus(constants.statusCodes.ise);
  }
}

exports.updateJobStatus = async (req, res) => {
  const accountId = res.locals.accountId;
  const dto = req.body;
  const jobId = req.params.id;
  if (!dto || !dto.status) {
    res.sendStatus(constants.statusCodes.ue);
  }
  const status = dto.status;
  const job = new Job();
  const result = await job.updateJobStatus(accountId, jobId, status);
  if (result.success) {
    res.sendStatus(constants.statusCodes.ok);
  } else {
    if (result.error && result.error.message === 'The job\'s state could not be updated') {
      res.status(result.error.status).send({ message: 'cannot process the job' });
      return;
    }
    res.sendStatus(constants.statusCodes.ise);
  }
}

exports.getJobStatus = async (req, res, next) => {
  const accountId = res.locals.accountId;
  const jobId = req.params.id;
  if (!jobId) {
    res.sendStatus(constants.statusCodes.ue);
  }
  const job = new Job();
  const result = await job.getJobStatus(accountId, jobId);
  if (result.success) {
    res.send(result.output.status);
  } else {
    res.sendStatus(constants.statusCodes.ise);
  }
}

exports.getActiveJobsForPath = async (req, res, next) => {
  const accountId = res.locals.accountId;
  const path = req.params.path;
  // path.replace("%2F", "/");
  console.log(`path:---- ${JSON.stringify(path)}`);
  if (!path) {
    res.sendStatus(constants.statusCodes.ue);
    return;
  }
  const job = new Job();
  const result = await job.getActiveJobsForPath(accountId, path);
  if (result.success) {
    res.send(result.output.jobs);
  } else {
    res.sendStatus(constants.statusCodes.ise);
  }
}

exports.getActiveJobs = async (req, res) => {
  const accountId = res.locals.accountId;
  const job = new Job();
  const result = await job.getActiveJobs(accountId);
  if (result.success) {
    res.send(result.output.jobs);
  } else {
    res.sendStatus(constants.statusCodes.ise);
  }
}
