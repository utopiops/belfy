const { handleRequest } = require('../helpers');
const yup = require('yup');
const alarmService = require('../../db/models/alarm_v2/alarm.service');

async function setEnvironmentAlarmState(req, res) {
  const validationSchema = yup.object().shape({
    code: yup
      .string()
      .oneOf(['deployed', 'deploy_failed', 'destroyed', 'destroy_failed'])
      .required(),
    job: yup.string().required(),
  });
  const handle = async () => {
    const { environmentId } = res.locals;
    const { alarmName } = req.params;

    return await alarmService.setState({ environmentId }, alarmName, req.body);
  };
  const extractOutput = async (outputs) => outputs;
  await handleRequest({ req, res, extractOutput, validationSchema, handle });
}

exports.handler = setEnvironmentAlarmState;
