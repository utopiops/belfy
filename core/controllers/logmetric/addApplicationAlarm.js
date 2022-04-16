const { handleRequest } = require('../helpers');
const yup = require('yup');
const alarmService = require('../../db/models/alarm_v2/alarm.service');
const alarmTypes = require('../../db/models/alarm_v2/alarmTypes');
const { getApplicationKind } = require('../../db/models/application/application.service');
const constants = require('../../utils/constants');

async function addApplicationAlarm(req, res) {
  const { environmentId } = res.locals;
  const { applicationName } = req.params;

  const result = await getApplicationKind(environmentId, applicationName);
  if (!result.success) {
    return result;
  }
  const applicationKind = result.output.kind;

  const validationSchema = yup.object().shape({
    alarmType: yup.string().oneOf(alarmTypes.aws.applications[applicationKind]).required(),
    evaluationPeriods: yup.string().required(),
    period: yup.string().required(),
    threshold: yup.string().required(),
    severity: yup.number().min(1).max(10),
    displayName: yup.string().required(),
    description: yup.string(),
    instanceGroupDisplayName:
      applicationKind == constants.applicationKinds.classicBaked
        ? yup.string().required()
        : yup.string(),
  });
  const handle = async () => {
    const { userId, accountId, environmentId, environmentName, credentials } = res.locals;
    const {
      alarmType,
      evaluationPeriods,
      period,
      threshold,
      instanceGroupDisplayName,
      severity,
      displayName,
      description,
    } = req.body;
    const { applicationName } = req.params;
    const providerDetails = res.locals.provider.backend;
    const jobPath = constants.jobPaths.deployApplicationAlarmCloudWatch;

    const result = await getApplicationKind(environmentId, applicationName);
    if (!result.success) {
      return result;
    }
    const applicationId = result.output.id;
    const applicationKind = result.output.kind;
    const resourceName = `${applicationName}_${environmentName}`;

    const alarm = {
      application: applicationId,
      alarmName: '', // will be completed in alarm.service
      displayName,
      description,
      alarmType,
      evaluationPeriods,
      period,
      threshold,
      accountId,
      severity,
      createdBy: userId,
      instanceGroupDisplayName: instanceGroupDisplayName ? instanceGroupDisplayName : undefined,
    };

    // add the alarm to DB
    const addResult = await alarmService.addAlarm(alarm, 'app', resourceName);
    if (!addResult.success) return addResult;

    console.log('starting to deploy ', addResult.outputs.alarmName);
    // then deploy it
    return await alarmService.tfActionAlarm(
      'deploy',
      userId,
      accountId,
      environmentId,
      environmentName,
      addResult.outputs.alarmName,
      credentials,
      providerDetails,
      jobPath,
      applicationName,
      applicationId,
    );
  };
  const extractOutput = async (outputs) => outputs;
  await handleRequest({ req, res, extractOutput, validationSchema, handle });
}

exports.handler = addApplicationAlarm;
