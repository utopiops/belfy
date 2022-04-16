const { handleRequest } = require('../helpers');
const alarmService = require('../../db/models/alarm_v2/alarm.service');

async function listEnvironmentAlarms(req, res) {
  const handle = async () => {
    const { environmentId } = res.locals;

    return await alarmService.listAlarms({ environmentId });
  };
  const extractOutput = async (outputs) => outputs.alarms;
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listEnvironmentAlarms;
