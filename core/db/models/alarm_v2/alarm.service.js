const AlarmModel = require('./alarm');
const uuid = require('uuid');
const { defaultLogger: logger } = require('../../../logger');
const constants = require('../../../utils/constants');
const config = require('../../../utils/config').config;
const queueService = require('../../../queue');
const appQueName = config.queueName;
const xml2js = require('xml2js');
const HttpService = require('../../../utils/http');
const MessageValidator = require('@nathancahill/sns-validator');
const { alarmStatusValues } = require('./alarmStatusValues');
const alarmTypes = require('./alarmTypes');
const HttpConfig = require('../../../utils/http/http-config');
const http = new HttpService();
const { getInternalToken } = require('../../../services/auth');
const Job = require('../job');
const job = new Job();

module.exports = {
  addAlarm,
  editAlarm,
  listAlarms,
  tfActionAlarm,
  setState,
  handleSnsMessage,
};

async function addAlarm(alarm, kind, resourceName) {
  try {
    alarm.alarmName = `${kind}-${uuid()}`;

    const doc = new AlarmModel(alarm);
    await doc.save();

    return {
      success: true,
      outputs: alarm,
    };
  } catch (err) {
    logger.error(err);
    return {
      success: false,
    };
  }
}
// -------------------------------------------
async function editAlarm(
  { applicationId, environmentId },
  alarmName,
  threshold,
  period,
  evaluationPeriods,
  displayName,
  severity,
) {
  try {
    const filter = {
      application: applicationId ? applicationId : undefined,
      environment: environmentId ? environmentId : undefined,
      alarmName,
      'state.code': { $nin: ['deploying', 'destroying'] },
    };
    const update = {
      threshold,
      period,
      evaluationPeriods,
      displayName,
      severity,
    };
    const doc = await AlarmModel.findOneAndUpdate(filter, update, { new: true }).exec();
    if (doc == null) {
      return {
        success: false,
        error: {
          message: `couldn't find any non-deployed alarm with this specifications`,
          statusCode: constants.statusCodes.notFound,
        },
      };
    }
    return {
      success: true,
    };
  } catch (err) {
    logger.error(err);
    return {
      success: false,
      message: err.message,
    };
  }
}
// -------------------------------------------
async function listAlarms({ applicationId, environmentId }) {
  try {
    const filter = {
      ...(applicationId ? { application: applicationId } : { environment: environmentId }),
    };
    const docs = await AlarmModel.find(filter, { _id: 0, __v: 0 })
      .populate('createdBy', 'username')
      .exec();
    if (docs == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound,
      };
    }
    return {
      success: true,
      outputs: {
        alarms: docs,
      },
    };
  } catch (err) {
    logger.error(err);
    return {
      success: false,
      message: err.message,
    };
  }
}
//---------------------------------------
async function deleteAlarm({ applicationId, environmentId }, alarmName) {
  const filter = {
    ...(applicationId ? { application: applicationId } : { environment: environmentId }),
    alarmName,
  };
  try {
    const doc = await AlarmModel.findOneAndDelete(filter).exec();
    if (doc == null || doc.deletedCount === 0) {
      return {
        success: false,
        error: {
          message: `couldn't find any non-deployed alarm with this specifications`,
          statusCode: constants.statusCodes.notFound,
        },
      };
    }
    return {
      success: true,
    };
  } catch (err) {
    logger.error(err);
    return {
      success: false,
      message: err.message,
    };
  }
}

// ---------------------------------------
async function tfActionAlarm(
  action,
  userId,
  accountId,
  environmentId,
  environmentName,
  alarmName,
  credentials,
  providerDetails,
  jobPath,
  applicationName = undefined,
  applicationId = undefined,
) {
  const alarm = await AlarmModel.findOne({ alarmName }).exec();
  // We set state before creating job to avoid deploying/destroying a job we should not as it's already being deployed/destroyed (order doesn't matter)
  try {
    if (action === 'deploy' || action === 'destroy') {
      const state = {
        code: action === 'deploy' ? 'deploying' : 'destroying',
      };
      const result = await setState({ applicationId, environmentId }, alarmName, state);
      if (!result.success) {
        return result;
      }
    }
  } catch (err) {
    logger.error(err);
    return {
      success: false,
      message: err.message,
    };
  }

  const message = {
    jobPath,
    jobDetails: {
      userId,
      accountId,
      details: {
        providerDetails,
        environmentName,
        applicationName,
        credentials,
        ...alarm._doc,
      },
    },
  };

  logger.info(`message:: ${message}`);

  const options = {
    userId: message.jobDetails.userId,
    accountId: message.jobDetails.accountId,
    path: message.jobPath,
    jobDataBag: {
      environmentName,
      applicationName,
      alarm,
    },
  };
  try {
    const jobId = await queueService.sendMessage(appQueName, message, options);
    // TODO: send job notification
    // Set the jobId in the state now that the message is sent
    await setJobId({ applicationId, environmentId }, alarmName, jobId);

    return {
      success: true,
      outputs: {
        jobId,
        alarmId: alarm.alarmName,
      },
    };
  } catch (error) {
    logger.error(error);

    if (
      error.message === 'failed to schedule the job' &&
      ['deploy', 'destroy'].indexOf(action) !== -1
    ) {
      const state = {
        code: action === 'deploy' ? 'deploy_failed' : 'destroy_failed',
        // Note: we're not setting the jobId, anyway the job hasn't even been sent to the queue, maybe we can use this as an indication of internal server error, todo: update portal based on this
      };
      await setState({ applicationId, environmentId }, alarmName, state);
      return {
        success: false,
        error: {
          message: 'Failed to schedule the job!',
          statusCode: constants.statusCodes.ise,
        },
      };
    }
    return {
      success: 'false',
    };
  }
}

//-------------------------------------
async function setState({ applicationId, environmentId }, alarmName, state) {
  try {
    const stateCode = state.code;
    let validCurrentState = [];
    switch (stateCode) {
      case 'destroyed':
      case 'destroy_failed':
        validCurrentState = ['destroying'];
        break;
      case 'deployed':
      case 'deploy_failed':
        validCurrentState = ['deploying'];
        break;
      case 'destroying':
        validCurrentState = [null, 'deployed', 'destroy_failed', 'deploy_failed'];
        break;
      case 'deploying':
        validCurrentState = [
          null,
          'created',
          'deployed',
          'destroyed',
          'destroy_failed',
          'deploy_failed',
        ];
        break;
    }

    const filter = {
      // Note: at the moment I don't match the job in the state, not sure if it makes sense to verify the same job responsible for current state is updating it
      ...(applicationId ? { application: applicationId } : { environment: environmentId }),
      alarmName,
      'state.code': { $in: validCurrentState },
    };
    const alarm = await AlarmModel.findOneAndUpdate(
      filter,
      { $set: { state } },
      { new: true },
    ).exec();

    if (state.code == 'destroyed') return deleteAlarm({ applicationId, environmentId }, alarmName);

    if (alarm == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound,
      };
    }
    return {
      success: true,
    };
  } catch (err) {
    logger.error(err);
    return {
      success: false,
      message: err.message,
    };
  }
}
// --------------------------------------
async function setJobId({ applicationId, environmentId }, alarmName, jobId) {
  try {
    const filter = {
      ...(applicationId ? { application: applicationId } : { environment: environmentId }),
      alarmName,
    };
    let update = {
      $set: { 'state.job': jobId },
    };
    let arrayFilters = [];
    return await AlarmModel.findOneAndUpdate(filter, update, {
      new: true,
      arrayFilters,
    }).exec();
  } catch (err) {
    logger.error(err);
    return {
      success: false,
      message: err.message,
    };
  }
}
// --------------------------------------
// this function only gets called by aws, therefore we dont authenticate incoming requests for this Endpoint
// the route is declared in app.js
async function handleSnsMessage(req, res) {
  const messageType = req.headers['x-amz-sns-message-type'];
  logger.info(`messageType: ${messageType}`);
  logger.info(`body: ${req.body}`);
  let body = JSON.parse(req.body);
  if (messageType === 'SubscriptionConfirmation') {
    try {
      await new MessageValidator().validate(
        Object.assign({}, body, {
          Type: 'SubscriptionConfirmation',
        }),
      );
      logger.info(`SubscriptionConfirmation signature is valid...`);
    } catch (e) {
      logger.error(`signature is invalid...`);
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    }

    const subscribeUrl = body.SubscribeURL;
    logger.info(`subscribeUrl: ${subscribeUrl}`);
    if (!subscribeUrl) {
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    }
    try {
      const resp = await new HttpService().get(subscribeUrl);
      logger.info(`response: ${JSON.stringify(resp.data)}`);
      const parser = new xml2js.Parser();
      const doc = await parser.parseStringPromise(resp.data);
      const subscriptionArn =
        doc.ConfirmSubscriptionResponse.ConfirmSubscriptionResult[0].SubscriptionArn[0];
      logger.info(`subscriptionArn: ${subscriptionArn}`);
      if (!subscriptionArn) {
        res.status(constants.statusCodes.badRequest).send({ error: 'Cannot find SubscriptionArn' });
        return;
      }
      res.sendStatus(constants.statusCodes.ok);
    } catch (e) {
      logger.error(e);
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    }
  } else if (messageType === 'Notification') {
    try {
      await new MessageValidator().validate(Object.assign({}, body));
      logger.info(`Notification signature is valid...`);
      const message = JSON.parse(body.Message);
      logger.info(`alarm message :: ${message}`);
      const { AlarmName: alarmName, NewStateValue: newStateValue } = message;
      logger.info(`alarm name :: ${alarmName}`);
      try {
        // Find the alarm and get its {effect} {enabled} {application} and {environment}

        const newStatus =
          newStateValue === 'ALARM'
            ? alarmStatusValues.alarm
            : newStateValue === 'OK'
            ? alarmStatusValues.ok
            : alarmStatusValues.insufficientData;
        const result = await updateStatus(alarmName, newStatus);
        if (!result.success) {
          if (result.message == constants.errorMessages.models.elementNotFound) {
            res.sendStatus(constants.statusCodes.badRequest);
            return;
          }
          res.sendStatus(constants.statusCodes.ise);
          return;
        }
        // send alert
        const token = await getInternalToken();
        const httpConfig = new HttpConfig().withBearerAuthToken(token);
        logger.info(`httpConfig:: ${JSON.stringify(httpConfig.headers)}`);
        const url = `${config.alarmManagerUrl}/alarm/alert`;
        // body = JSON.parse(body);
        const alarmData = {
          accountId: result.outputs.accountId,
          alarmSender: 'cloudWatch',
          alarmType: result.outputs.alarmType,
          threshold: result.outputs.threshold,
          alarm_id: result.outputs.alarmName,
          severity: result.outputs.severity,
          status: result.outputs.status,
          displayName: result.outputs.displayName,
          application: result.outputs.application ? result.outputs.application.name : '',
          environment: result.outputs.environment ? result.outputs.environment.name : '',
          message,
        };
        logger.info(`alarmData:: ${JSON.stringify(alarmData)}`);

        const alertResult = await http.post(url, alarmData, httpConfig.config);
        logger.info(`Alert manager response: ${alertResult.status}`);
        res.sendStatus(constants.statusCodes.ok);
        return;
      } catch (e) {
        logger.error(`Failed to send alert  ${e}`);
        res.sendStatus(constants.statusCodes.ise);
        return;
      }
    } catch (e) {
      logger.error(`err:  ${e}`);
      res.sendStatus(constants.statusCodes.badRequest);
      return;
    }
  }
}

//---------------------------------------
async function updateStatus(name, newStatus) {
  try {
    const filter = { alarmName: name };
    const update = { status: newStatus };
    const doc = await AlarmModel.findOneAndUpdate(filter, update, { new: true })
      .populate('application', 'name')
      .populate('environment', 'name')
      .exec();

    if (doc == null) {
      return {
        success: false,
        message: constants.errorMessages.models.elementNotFound,
      };
    }
    return {
      success: true,
      outputs: doc,
    };
  } catch (err) {
    console.error(`error`, err);
    return {
      success: false,
      message: err.message,
    };
  }
}
