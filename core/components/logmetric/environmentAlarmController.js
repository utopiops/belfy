const constants = require('../../utils/constants');
const tokenService = require('../../utils/auth/tokenService');
const queueService = require('../../queue');
const yup = require('yup');
const { getEnvironmentIdAndProvider } = require('./helpers');
const EnvironmentAlarmPredefinedModel = require('../../db/models/environment_alarm/environmentAlarmPredefined');
const EnvironmentAlarmModel = require('../../db/models/environment_alarm/environmentAlarm');
const ApplicationAlarmModel = require('../../db/models/alarm/applicationAlarm');
const EnvironmentModel = require('../../db/models/environment_application/environment');
const EnvironmentApplicationModel = require('../../db/models/environment_application/application');
const { alarmTypes } = require('../../db/models/environment_alarm/environmentAlarmTypes');
const { alarmStates } = require('../../db/models/environment_alarm/environmentAlarmStates');
const uuid = require('uuid/v4');
const xml2js = require('xml2js');
const HttpService = require('../../utils/http');
const MessageValidator = require('@nathancahill/sns-validator');
const { alarmEffects } = require('../../db/models/alarm/alarmEffects');
const { alarmStatusValues } = require('../../db/models/alarm/alarmStatusValues');

const { config } = require('../../utils/config');

const appQueName = config.queueName;

exports.addPredefinedEnvironmentAlarm = addPredefinedEnvironmentAlarm;
exports.updatePredefineEnvironmentAlarm = updatePredefineEnvironmentAlarm;

exports.listEnvironmentAlarms = listEnvironmentAlarms;
exports.listPredefinedEnvironmentAlarmsTypes = listPredefinedEnvironmentAlarmsTypes;
exports.deleteEnvironmentAlarm = deleteEnvironmentAlarm;
exports.finishDeployAlarm = finishDeployAlarm;
exports.finishDestroyAlarm = finishDestroyAlarm;
exports.handleSnsMessage = handleSnsMessage;

//----------------------------------
/*
  Saves the alarm in the database, deploys it / (starts the deployment) and updates the status to deploying
*/
async function addPredefinedEnvironmentAlarm(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const { name: environmentName } = req.params;

  const validationSchema = yup.object().shape({
    type: yup.string().oneOf(alarmTypes).matches(/^aws::[a-z_]+::.*$/).required(),
    period: yup.number().required(),
    threshold: yup.string().required(),
    resource: yup.string().matches(/^aws::[a-z_]+::.*$/).required(),
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

  const { type, period, threshold, extras, resource } = req.body;
  const name = uuid();

  // check if the alarm is compatible with the resource and environment
  const environmentProvider = provider.backend.name;
  const alarmTypeSplit = type.split("::");
  const resourceSplit = resource.split("::");
  if (alarmTypeSplit[0] !== environmentProvider || alarmTypeSplit[0] !== resourceSplit[0] || alarmTypeSplit[1] !== resourceSplit[1]) {
    res.sendStatus(constants.statusCodes.badRequest);
    return;
  }
  // todo: also validate the resource to exist

  try {
    const alarm = { userId, name, environmentId, type, threshold, period, resource, extras };
    let result = await EnvironmentAlarmPredefinedModel.addAlarm(alarm);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.duplicate) {
        res.sendStatus(constants.statusCodes.duplicate);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
    } else {
      await deployAlarm(environmentName, environmentId, userId, accountId, provider, { ...alarm, name: result.output.name }, res);
    }
  } catch (e) {
    res.sendStatus(constants.statusCodes.ise);
  }
}
//----------------------------------
/*
  Updates the alarm in the database, deploys it and updates the status to deploying
*/
async function updatePredefineEnvironmentAlarm(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const { name: environmentName, alarmName } = req.params;

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


  const { period, threshold, extras } = req.body;
  try {
    let result = await EnvironmentAlarmPredefinedModel.updateAlarm({ environmentId, name: alarmName, threshold, period, extras });
    console.log(`result`, result);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.status(constants.statusCodes.badRequest).send({ message: "Alarm not found or is in a state it cannot be updated" });
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
    } else {
      await deployAlarm(environmentId, alarmName, userId, accountId, provider, res);
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (e) {
    res.sendStatus(constants.statusCodes.ise);
  }
}
//----------------------------------
/*
  Deletes the alarm in the database, destroys it and updates the status to destroying
*/
async function deleteEnvironmentAlarm(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const { name: environmentName, alarmName } = req.params;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId, provider } = result;


  // Check if the alarm exists and its status
  try {
    const result = await EnvironmentAlarmModel.getAlarm(environmentId, alarmName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return;
    }
    const alarm = result.output.alarm;
    // TODO: [MVP-364] the state might be deleting/destroying but the job might be failed (or started like 1 hour ago), check the job and don't send 402 if it's so
    // todo: implement a retry and ack/nack mechanism in inf-worker to set the job status to failed after some retries and the update here
    if ([alarmStates.deployed, alarmStates.deployFailed, alarmStates.destroyFailed].indexOf(alarm.state.code) === -1) {
      res.status(constants.statusCodes.badRequest).send("Cannot delete the alarm with its current state.");
      return;
    }
    await destroyAlarm(environmentName, environmentId, alarm, userId, accountId, provider, true, res);
  } catch (e) {
    console.log(`error:`, e.message);
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
  const { name: environmentName, alarmName } = req.params;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;

  // Check if the alarm exists and get its state
  let state;
  try {
    const result = await EnvironmentAlarmModel.getAlarmState(environmentId, alarmName);
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

  const { jobId, success, reason } = req.body.jobResult;
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
      let result = await EnvironmentAlarmModel.updateState(environmentId, alarmName, { stateCode, stateReason }, jobId);
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
      let result = await EnvironmentAlarmModel.deleteAlarm(environmentId, alarmName);
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
  const { name: environmentName, alarmName } = req.params;

  // Check if the environment exist and get its id
  const result = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!result) {
    return;
  }
  const { environmentId } = result;


  // Check if the alarm exists. I'm ignoring the state
  try {
    const result = await EnvironmentAlarmModel.getAlarmState(environmentId, alarmName);
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
    const { jobId, success, reason } = req.body.jobResult;
    let stateCode, stateReason;
    if (!success) {
      stateCode = alarmStates.deployFailed;
      stateReason = reason;
    } else {
      stateCode = alarmStates.deployed;
    }
    let result = await EnvironmentAlarmModel.updateState(environmentId, alarmName, { stateCode, stateReason }, jobId);
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
async function listEnvironmentAlarms(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const { name: environmentName } = req.params;

  // Check if the environment exist and get its id
  const { environmentId } = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!environmentId) {
    return;
  }

  const { success, output } = await EnvironmentAlarmModel.listAlarms(environmentId);
  if (success) {
    res.send(output.alarms);
  } else {
    res.sendStatus(constants.statusCodes.ise);
  }
}
//----------------------------------
async function listPredefinedEnvironmentAlarmsTypes(req, res) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const { name: environmentName } = req.params;

  // Check if the environment exist and get its id
  const { environmentId } = await getEnvironmentIdAndProvider(accountId, environmentName, res);
  if (!environmentId) {
    return;
  }

  const { success, output } = await EnvironmentAlarmModel.listPredefinedAlarmsTypes(environmentId);
  if (success) {
    res.send(output.alarms);
  } else {
    res.sendStatus(constants.statusCodes.ise);
  }
}

//----------------------------------

/*
This function handles three types of SNS message (types are specified by the header field x-amz-sns-message-type)
    * subscription confirmation
    * unsubscribe confirmation
    * notification
Note: All the message types are verified.
see: https://docs.aws.amazon.com/sns/latest/dg/SendMessageToHttp.prepare.html 
*/
async function handleSnsMessage(req, res) {
  const messageType = req.headers['x-amz-sns-message-type']
  console.log(`messageType: `, messageType);
  console.log(`body: `, req.body);
  const body = JSON.parse(req.body);
  if (messageType === 'SubscriptionConfirmation') {

    try {
      await new MessageValidator()
        .validate(Object.assign({}, body, {
          Type: 'SubscriptionConfirmation'
        }));
      console.log(`signature is valid...`);
    } catch (e) {
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    }

    const subscribeUrl = body.SubscribeURL;
    console.log(`subscribeUrl: `, subscribeUrl);
    if (!subscribeUrl) {
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    }
    try {
      const resp = await new HttpService().get(subscribeUrl);
      console.log(`response:`, resp.data);
      const parser = new xml2js.Parser();
      const doc = await parser.parseStringPromise(resp.data);
      const subscriptionArn = doc.ConfirmSubscriptionResponse.ConfirmSubscriptionResult[0].SubscriptionArn[0];
      console.log(`subscriptionArn:`, subscriptionArn);
      if (!subscriptionArn) {
        res.status(constants.statusCodes.badRequest).send({ error: 'Cannot find SubscriptionArn' });
        return;
      }
      res.sendStatus(constants.statusCodes.ok);
    } catch (e) {
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    }

  } else if (messageType === 'Notification') {
    try {
      await new MessageValidator()
        .validate(Object.assign({}, body));
      console.log(`signature is valid...`);
      const message = JSON.parse(body.Message);
      const { AlarmName: alarmName, NewStateValue: newStateValue } = message;
      try {
        // Find the alarm and get its {effect} {enabled} {application} and {environment}

        let newStatus = newStateValue === 'ALARM' ? alarmStatusValues.alarm : newStateValue === 'OK' ? alarmStatusValues.ok : alarmStatusValues.insufficientData;
        let result;
        if (message.AlarmName.startsWith("env")) { // This is an environment alarm
          result = await EnvironmentAlarmModel.updateStatus(alarmName, newStatus);
        } else {
          result = await ApplicationAlarmModel.updateStatus(alarmName, newStatus);
        }
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
    } catch (e) {
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    }

  }
}

//---------------------------------------- Utility function

/*
  deployAlarm decides how to deploy an alarm based on the metric provider.The deployment can be as simple as an API call or as complex as deploying Terraform
*/
async function deployAlarm(environmentName, environmentId, userId, accountId, provider, alarm, res) {

  const jobPath = constants.jobPaths.deployEnvironmentAlarmCloudWatch;

  const message = {
    jobPath,
    jobDetails: {
      userId,
      accountId,
      details: {
        environmentName,
        environmentId,
        provider,
        alarm,
      }
    }
  };
  const options = {
    userId: message.jobDetails.userId,
    accountId: message.jobDetails.accountId,
    path: message.jobPath,
    jobDataBag: {
      environmentName,
      alarm,
    }
  };
  try {
    const jobId = await queueService.sendMessage(appQueName, message, options);
    await EnvironmentAlarmModel.updateState(environmentId, alarm.name, { stateCode: alarmStates.deploying }, jobId);
    res.send({ jobId, alarmName: alarm.name });
  } catch (e) {
    // simply send 500 and ask the user to retry. Deploy should be idempotent
    res.sendStatus(constants.statusCodes.ise);
  }
}

/*
  destroyAlarm decides how to deploy an alarm based on the metric provider.The deployment can be as simple as an API call or as complex as deploying Terraform
*/
async function destroyAlarm(environmentName, environmentId, alarm, userId, accountId, provider, isDelete, res) {

  const jobPath = constants.jobPaths.destroyEnvironmentAlarmCloudWatch;

  const message = {
    jobPath,
    jobDetails: {
      userId,
      accountId,
      details: {
        environmentName,
        environmentId,
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
      alarm,
    }
  };
  try {
    const jobId = await queueService.sendMessage(appQueName, message, options);
    await EnvironmentAlarmModel.updateState(environmentId, alarm.name, { stateCode: isDelete ? alarmStates.deleting : alarmStates.destroying }, jobId);
    res.send({ jobId });
  } catch (e) {
    // simply send 500 and ask the user to retry. Destroy should be idempotent
    res.sendStatus(constants.statusCodes.ise);
  }
}



