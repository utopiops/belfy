const { handleRequest } = require('../helpers');
const yup = require('yup');
const alarmService = require('../../db/models/alarm_v2/alarm.service');
const alarmTypes = require('../../db/models/alarm_v2/alarmTypes');
const constants = require('../../utils/constants');

async function addEnvironmentAlarm(req, res) {
  const validationSchema = yup.object().shape({
    alarmType: yup.string().oneOf(Object.values(alarmTypes.aws.environments).flat()).required(),
    evaluationPeriods: yup.string().required(),
    period: yup.string().required(),
    threshold: yup.string().required(),
    severity: yup.number().min(1).max(10),
    displayName: yup.string().required(),
    description: yup.string(),
    ecsClusterName: yup
      .string()
      .ensure()
      .when('alarmType', {
        is: (val) => alarmTypes.aws.environments.ecs.includes(val),
        then: yup.string().required(),
      }),
    albDisplayName: yup
      .string()
      .ensure()
      .when('alarmType', {
        is: (val) => alarmTypes.aws.environments.elb.includes(val),
        then: yup.string().required(),
      }),
  });
  const handle = async () => {
    const { userId, environmentId, accountId, environmentName, credentials } = res.locals;
    const {
      alarmType,
      evaluationPeriods,
      period,
      threshold,
      ecsClusterName,
      albDisplayName,
      severity,
      displayName,
      description,
    } = req.body;
    const providerDetails = res.locals.provider.backend;
    const jobPath = constants.jobPaths.deployEnvironmentAlarmCloudWatch;

    const alarm = {
      environment: environmentId,
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
      ecsClusterName,
      albDisplayName,
    };

    // add the alarm to DB
    const result = await alarmService.addAlarm(alarm, 'env', environmentName);
    if (!result.success) return result;

    console.log('starting to deploy ', result.outputs.alarmName);
    // then deploy it
    return await alarmService.tfActionAlarm(
      'deploy',
      userId,
      accountId,
      environmentId,
      environmentName,
      result.outputs.alarmName,
      credentials,
      providerDetails,
      jobPath,
    );
  };
  const extractOutput = async (outputs) => outputs;
  await handleRequest({ req, res, extractOutput, validationSchema, handle });
}

exports.handler = addEnvironmentAlarm;
