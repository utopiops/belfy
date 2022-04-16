const { handleRequest } = require('../helpers');
const alarmService = require('../../db/models/alarm_v2/alarm.service');
const constants = require('../../utils/constants');

async function deleteEnvironmentAlarm(req, res) {
  const handle = async () => {
    const { userId, accountId, environmentId, environmentName, credentials } = res.locals;
    const { alarmName } = req.params;
    const providerDetails = res.locals.provider.backend;
    const jobPath = constants.jobPaths.destroyEnvironmentAlarmCloudWatch;

    // will destroy the alarm now and will delete it from DB when infw calls setState
    return await alarmService.tfActionAlarm(
      'destroy',
      userId,
      accountId,
      environmentId,
      environmentName,
      alarmName,
      credentials,
      providerDetails,
      jobPath,
    );
  };
  await handleRequest({ req, res, handle });
}

exports.handler = deleteEnvironmentAlarm;
