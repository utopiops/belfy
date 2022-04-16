const { handleRequest } = require('../helpers');
const yup = require('yup');
const alarmService = require('../../db/models/alarm_v2/alarm.service');
const { getApplicationKind } = require('../../db/models/application/application.service');
const constants = require('../../utils/constants');

async function editApplicationAlarm(req, res) {
  const validationSchema = yup.object().shape({
    period: yup.number().required(),
    threshold: yup.string().required(),
    evaluationPeriods: yup.string().required(),
    severity: yup.number().min(1).max(10),
  });
  const handle = async () => {
    const { userId, accountId, environmentId, environmentName, credentials } = res.locals;
    const { evaluationPeriods, period, threshold, displayName, severity } = req.body;
    const { applicationName, alarmName } = req.params;
    const providerDetails = res.locals.provider.backend;
    const jobPath = constants.jobPaths.deployApplicationAlarmCloudWatch;

    const result = await getApplicationKind(environmentId, applicationName);
    if (!result.success) {
      return result;
    }
    const applicationId = result.output.id;

    // edit the alarm in DB
    const editResult = await alarmService.editAlarm(
      { applicationId },
      alarmName,
      threshold,
      period,
      evaluationPeriods,
      displayName,
      severity,
    );
    if (!editResult.success) return editResult;

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
      applicationName,
      applicationId,
    );
  };
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = editApplicationAlarm;
