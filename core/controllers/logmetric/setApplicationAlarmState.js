const { handleRequest } = require('../helpers');
const yup = require('yup');
const alarmService = require('../../db/models/alarm_v2/alarm.service');
const { getApplicationKind } = require('../../db/models/application/application.service');

async function setApplicationAlarmState(req, res) {
  const validationSchema = yup.object().shape({
    code: yup
      .string()
      .oneOf(['deployed', 'deploy_failed', 'destroyed', 'destroy_failed'])
      .required(),
    job: yup.string().required(),
  });
  const handle = async () => {
    const { environmentId } = res.locals;
    const { applicationName, alarmName } = req.params;

    const result = await getApplicationKind(environmentId, applicationName);
    if (!result.success) {
      return result;
    }
    const applicationId = result.output.id;

    return await alarmService.setState({ applicationId }, alarmName, req.body);
  };
  const extractOutput = async (outputs) => outputs;
  await handleRequest({ req, res, extractOutput, validationSchema, handle });
}

exports.handler = setApplicationAlarmState;
