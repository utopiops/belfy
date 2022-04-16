const { handleRequest } = require('../helpers');
const alarmService = require('../../db/models/alarm_v2/alarm.service');
const { getApplicationKind } = require('../../db/models/application/application.service');
const constants = require('../../utils/constants');

async function deleteApplicationAlarm(req, res) {
  const handle = async () => {
    const { userId, accountId, environmentId, environmentName, credentials } = res.locals;
    const { applicationName, alarmName } = req.params;
    const providerDetails = res.locals.provider.backend;
    const jobPath = constants.jobPaths.destroyApplicationAlarmCloudWatch;

    const result = await getApplicationKind(environmentId, applicationName);
    if (!result.success) {
      return result;
    }
    const applicationId = result.output.id;

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
      applicationName,
      applicationId,
    );
  };
  await handleRequest({ req, res, handle });
}

exports.handler = deleteApplicationAlarm;
