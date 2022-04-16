const { handleRequest } = require('../helpers');
const yup = require('yup');
const constants = require('../../utils/constants');
const alarmService = require('../../db/models/alarm_v2/alarm.service');

async function editEnvironmentAlarm(req, res) {
  const validationSchema = yup.object().shape({
    period: yup.number().required(),
    threshold: yup.string().required(),
    evaluationPeriods: yup.string().required(),
    severity: yup.number().min(1).max(10),
  });
  const handle = async () => {
    const { userId, accountId, environmentId, environmentName, credentials } = res.locals;
    const { evaluationPeriods, period, threshold, displayName, severity } = req.body;
    const { alarmName } = req.params;
    const providerDetails = res.locals.provider.backend;
    const jobPath = constants.jobPaths.deployEnvironmentAlarmCloudWatch;

    // edit the alarm in DB
    const result = await alarmService.editAlarm(
      { environmentId },
      alarmName,
      threshold,
      period,
      evaluationPeriods,
      displayName,
      severity,
    );
    if (!result.success) return result;

    // then deploy it again
    return await alarmService.tfActionAlarm(
      'deploy',
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
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = editEnvironmentAlarm;
