const constants = require('../../utils/constants');
const tokenService = require('../../utils/auth/tokenService');
const queueService = require('../../queue');
const yup = require('yup');
const { getEnvironmentIdAndProvider, getApplicationKind } = require('./helpers');
const ApplicationAlarmPredefinedModel = require('../../db/models/alarm/applicationAlarmPredefined');
const ApplicationAlarmModel = require('../../db/models/alarm/applicationAlarm');
const { alarmCategories, alarmTypes } = require('../../db/models/alarm/applicationAlarmTypes');
const { alarmStates } = require('../../db/models/alarm/applicationAlarmStates');
const uuid = require('uuid/v4');


const { config } = require('../../utils/config');

const appQueName = config.queueName;

exports.addPredefinedApplicationAlarm = addPredefinedApplicationAlarm;
exports.updatePredefineApplicationAlarm = updatePredefineApplicationAlarm;

exports.listApplicationAlarms = listApplicationAlarms;
exports.listPredefinedApplicationAlarmsTypes = listPredefinedApplicationAlarmsTypes;
exports.deleteApplicationAlarm = deleteApplicationAlarm;
exports.finishDeployAlarm = finishDeployAlarm;
exports.finishDestroyAlarm = finishDestroyAlarm;

//----------------------------------
/*
  Saves the alarm in the database, deploys it / (starts the deployment) and updates the status to deploying
*/
async function addPredefinedApplicationAlarm(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const { name: environmentName, applicationName } = req.params;

  const validationSchema = yup.object().shape({
    type: yup.string().oneOf(alarmTypes)
      .required(),
    period: yup.number().required(),
    threshold: yup.string().required(),
    extras: yup.object()
  });

  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId, provider } = result;

  // Check if the application exist and get its id
  const applicationKindAndId = await getApplicationKind(environmentId, applicationName, res);
  if (!applicationKindAndId) {
    return;
  }
  const applicationId = applicationKindAndId.id;
  const applicationKind = applicationKindAndId.kind;

  const { type, period, threshold, extras } = req.body;
  const name = uuid();

  // check if the alarm with this name can be added to this application kind
  const providerType = provider.backend.name;
  if (alarmCategories[providerType][applicationKind].indexOf(type) === -1) {
    res.sendStatus(constants.statusCodes.badRequest);
    return;
  }

  try {
    const alarm = { userId, applicationId, name, type, threshold, period, extras };
    let result = await ApplicationAlarmPredefinedModel.addAlarm(alarm);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.duplicate) {
        res.sendStatus(constants.statusCodes.duplicate);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
    } else {
      await deployAlarm(environmentName, applicationName, applicationId, { ...alarm, name: result.output.name }, userId, accountId, provider, res);
    }
  } catch (e) {
    console.log("error: ", e.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
//----------------------------------
/*
  Updates the alarm in the database, deploys it and updates the status to deploying
*/
async function updatePredefineApplicationAlarm(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const { name: environmentName, applicationName, alarmName } = req.params;

  const validationSchema = yup.object().shape({
    period: yup.number().required(),
    threshold: yup.string().required(),
    extras: yup.object()
  });

  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId, provider } = result;

  const applicationKindAndId = await getApplicationKind(environmentId, applicationName, res);
  if (!applicationKindAndId) {
    return;
  }
  const applicationId = applicationKindAndId.id;

  try {
    const { period, threshold, extras } = req.body;
    const alarm = { applicationId, name: alarmName, threshold, period, extras }
    let result = await ApplicationAlarmPredefinedModel.updateAlarm(alarm);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
    } else {
      await deployAlarm(environmentName, applicationName, applicationId, alarm, userId, accountId, provider, res);
    }
  } catch (e) {
    res.sendStatus(constants.statusCodes.ise);
  }
}
//----------------------------------
/*
  Deletes the alarm in the database, destroys it and updates the status to destroying
*/
async function deleteApplicationAlarm(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const { name: environmentName, applicationName, alarmName } = req.params;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId, provider } = result;

  // Check if the application exist and get its id
  const applicationKindAndId = await getApplicationKind(environmentId, applicationName, res);
  if (!applicationKindAndId) {
    return;
  }
  const applicationId = applicationKindAndId.id;

  // Check if the alarm exists
  // todo: should I check the state too?
  try {
    const result = await ApplicationAlarmModel.getAlarm(applicationId, alarmName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    }
    const alarm = result.output.alarm;
    if ([alarmStates.toDeploy, alarmStates.deployed, alarmStates.deployFailed, alarmStates.destroyFailed].indexOf(alarm.state.code) === -1) {
      res.status(constants.statusCodes.badRequest).send({ message: "Cannot delete the alarm with its current state." });
      return;
    }
    await destroyAlarm(environmentName, applicationName, applicationId, alarm, userId, accountId, provider, true, res);
  } catch (e) {
    res.sendStatus(constants.statusCodes.ise);
    return;
  }
}
//----------------------------------
/*
  Updates the alarm in the database, deploys it and updates the status to deploying
*/
async function finishDestroyAlarm(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const { name: environmentName, applicationName, alarmName } = req.params;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  // Check if the application exist and get its id
  const applicationKindAndId = await getApplicationKind(environmentId, applicationName, res);
  if (!applicationKindAndId) {
    return;
  }
  const applicationId = applicationKindAndId.id;

  // Check if the alarm exists and get its state
  let state;
  try {
    const result = await ApplicationAlarmModel.getAlarmState(applicationId, alarmName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    } else {
      state = result.output.state;
    }
  } catch (e) {
    res.sendStatus(constants.statusCodes.ise);
    return;
  }

  const { jobId, success, reason = null } = req.body.jobResult;
  if (state.code === alarmStates.destroying || !success) { // success is checked here to set the state to destroy_failed no matter why destroy was happening
    // just update the state
    try {
      let stateCode, stateReason;
      if (!success) {
        stateCode = alarmStates.destroyFailed;
        stateReason = reason;
      } else {
        stateCode = alarmStates.destroyed;
      }
      let result = await ApplicationAlarmModel.updateState(applicationId, alarmName, { stateCode, stateReason }, jobId);
      if (!result.success) {
        res.sendStatus(constants.statusCodes.ise);
      } else {
        res.sendStatus(constants.statusCodes.ok);
      }
    } catch (e) {
      res.sendStatus(constants.statusCodes.ise);
    }
  } else {
    // it's been a destroy as part of deletion, delete the alarm
    try {
      let result = await ApplicationAlarmModel.deleteAlarm(applicationId, alarmName);
      if (!result.success) {
        res.sendStatus(constants.statusCodes.ise);
      } else {
        res.sendStatus(constants.statusCodes.ok);
      }
    } catch (e) {
      res.sendStatus(constants.statusCodes.ise);
    }
  }

}
//----------------------------------
/*
  Updates the alarm in the database, deploys it and updates the status to deploying
*/
async function finishDeployAlarm(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const { name: environmentName, applicationName, alarmName } = req.params;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  // Check if the application exist and get its id
  const applicationKindAndId = await getApplicationKind(environmentId, applicationName, res);
  if (!applicationKindAndId) {
    return;
  }
  const applicationId = applicationKindAndId.id;

  // Check if the alarm exists. I'm ignoring the state
  try {
    const result = await ApplicationAlarmModel.getAlarmState(applicationId, alarmName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    }
  } catch (e) {
    res.sendStatus(constants.statusCodes.ise);
    return;
  }

  try {
    const { jobId, success, reason = null } = req.body.jobResult;
    let stateCode, stateReason;
    if (!success) {
      stateCode = alarmStates.deployFailed;
      stateReason = reason;
    } else {
      stateCode = alarmStates.deployed;
    }
    console.log(`stateCode:::`, stateCode);
    let result = await ApplicationAlarmModel.updateState(applicationId, alarmName, { stateCode, stateReason }, jobId);
    if (!result.success) {
      res.sendStatus(constants.statusCodes.ise);
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (e) {
    res.sendStatus(constants.statusCodes.ise);
  }

}
//----------------------------------
async function listApplicationAlarms(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const { name: environmentName, applicationName } = req.params;

  // Check if the environment exist and get its id
  const { environmentId } = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!environmentId) {
    return;
  }

  // Check if the application exist and get its id
  const applicationKindAndId = await getApplicationKind(environmentId, applicationName, res);
  if (!applicationKindAndId) {
    return;
  }
  const applicationId = applicationKindAndId.id;

  const { success, output } = await ApplicationAlarmModel.listAlarms(applicationId);
  if (success) {
    res.send(output.alarms);
  } else {
    res.sendStatus(constants.statusCodes.ise);
  }
}
//----------------------------------
async function listPredefinedApplicationAlarmsTypes(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const { name: environmentName, applicationName } = req.params;

  // Check if the environment exist and get its id
  const { environmentId } = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!environmentId) {
    return;
  }

  // Check if the application exist and get its id
  const applicationKindAndId = await getApplicationKind(environmentId, applicationName, res);
  if (!applicationKindAndId) {
    return;
  }
  const applicationId = applicationKindAndId.id;

  const { success, output } = await ApplicationAlarmModel.listPredefinedAlarmsTypes(applicationId);
  if (success) {
    res.send(output.alarms);
  } else {
    res.sendStatus(constants.statusCodes.ise);
  }
}


//---------------------------------------- Utility function

/*
  deployAlarm decides how to deploy an alarm based on the metric provider.The deployment can be as simple as an API call or as complex as deploying Terraform
*/
async function deployAlarm(environmentName, applicationName, applicationId, alarm, userId, accountId, provider, res) {

  const jobPath = constants.jobPaths.deployApplicationAlarmCloudWatch;

  const message = {
    jobPath,
    jobDetails: {
      userId,
      accountId,
      details: {
        environmentName,
        applicationName,
        alarm,
        provider,
      }
    }
  };
  const options = {
    userId: message.jobDetails.userId,
    accountId: message.jobDetails.accountId,
    path: message.jobPath,
    jobDataBag: {
      environmentName,
      applicationName,
      alarm,
    }
  };
  try {
    const jobId = await queueService.sendMessage(appQueName, message, options);
    await ApplicationAlarmModel.updateState(applicationId, alarm.name, { stateCode: alarmStates.deploying }, jobId);
    res.send({ jobId, alarmName: alarm.name });
  } catch (e) {
    // simply send 500 and ask the user to retry. Deploy should be idempotent
    res.sendStatus(constants.statusCodes.ise);
  }
}

/*
  destroyAlarm decides how to deploy an alarm based on the metric provider.The deployment can be as simple as an API call or as complex as deploying Terraform
*/
async function destroyAlarm(environmentName, applicationName, applicationId, alarm, userId, accountId, provider, isDelete, res) {

  const jobPath = constants.jobPaths.destroyApplicationAlarmCloudWatch;

  const message = {
    jobPath,
    jobDetails: {
      userId,
      accountId,
      details: {
        environmentName,
        applicationName,
        alarm,
        provider,
      }
    }
  };
  const options = {
    userId: message.jobDetails.userId,
    accountId: message.jobDetails.accountId,
    path: message.jobPath,
    jobDataBag: {
      environmentName,
      applicationName,
      alarm,
    }
  };
  try {
    const jobId = await queueService.sendMessage(appQueName, message, options);
    await ApplicationAlarmModel.updateState(applicationId, alarm.name, { stateCode: isDelete ? alarmStates.deleting : alarmStates.destroying }, jobId);
    res.send({ jobId });
  } catch (e) {
    // simply send 500 and ask the user to retry. Destroy should be idempotent
    res.sendStatus(constants.statusCodes.ise);
  }
}



