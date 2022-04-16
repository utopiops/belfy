const { handleRequest } = require('../helpers');
const alarmService = require('../../db/models/alarm_v2/alarm.service');
const { getApplicationKind } = require('../../db/models/application/application.service');

async function listApplicationAlarms(req, res) {
  const handle = async () => {
    const { environmentId } = res.locals;
    const { applicationName } = req.params;
    
    const result = await getApplicationKind(environmentId, applicationName);
    if (!result.success) {
      return result;
    }
    const applicationId = result.output.id;

    return await alarmService.listAlarms({ applicationId });
  };
  const extractOutput = async (outputs) => outputs.alarms;
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listApplicationAlarms;
