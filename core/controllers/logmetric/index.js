const express = require('express');
const router = express.Router();
const { getProviderWithCredentialsV2 } = require('../../middlewares/getProviderV2');

const { handler: getLogMetric } = require('./getLogMetric');
const { handler: addLogMetric } = require('./addLogMetric');
const { handler: editLogMetric } = require('./editLogMetric');
const { handler: deleteLogMetric } = require('./deleteLogMetric');

const { handler: addMetricProviderCloudWatch } = require('./addMetricProviderCloudWatch');
const { handler: listMetricProviders } = require('./listMetricProviders');
const { handler: deleteMetricProviders } = require('./deleteMetricProviders');

const { handler: listApplicationAlarms } = require('./listApplicationAlarms');
const { handler: addApplicationAlarm } = require('./addApplicationAlarm');
const { handler: editApplicationAlarm } = require('./editApplicationAlarm');
const { handler: deleteApplicationAlarm } = require('./deleteApplicationAlarm');
const { handler: setApplicationAlarmState } = require('./setApplicationAlarmState');

const { handler: listEnvironmentAlarms } = require('./listEnvironmentAlarms');
const { handler: addEnvironmentAlarm } = require('./addEnvironmentAlarm');
const { handler: editEnvironmentAlarm } = require('./editEnvironmentAlarm');
const { handler: deleteEnvironmentAlarm } = require('./deleteEnvironmentAlarm');
const { handler: setEnvironmentAlarmState } = require('./setEnvironmentAlarmState');

const { handler: enableLogsSettings } = require('./enableLogsSettings');

// NOTE: the sns endpoint belongs here but in order to skip auth for it, we placed it in app.js

router.get('/', getLogMetric);
router.post('/', addLogMetric);
router.patch('/:id', editLogMetric);
router.delete('/:id', deleteLogMetric);

// metrics
router.post(
  '/metric/environment/name/:environmentName/provider/cloudwatch',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  addMetricProviderCloudWatch,
);
router.get(
  '/metric/environment/name/:environmentName/provider',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  listMetricProviders,
);
router.delete(
  '/metric/environment/name/:environmentName/provider',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  deleteMetricProviders,
);

// application alarms
router.get(
  '/alarm/environment/name/:environmentName/application/name/:applicationName',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  listApplicationAlarms,
);

router.post(
  '/alarm/environment/name/:environmentName/application/name/:applicationName',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  addApplicationAlarm,
);

router.put(
  '/alarm/environment/name/:environmentName/application/name/:applicationName/alarm/name/:alarmName',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  editApplicationAlarm,
);

router.delete(
  '/alarm/environment/name/:environmentName/application/name/:applicationName/alarm/name/:alarmName',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  deleteApplicationAlarm,
);

router.post(
  '/alarm/environment/name/:environmentName/application/name/:applicationName/alarm/name/:alarmName/setState',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  setApplicationAlarmState,
);

// environment alarms
router.get(
  '/alarm/environment/name/:environmentName',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  listEnvironmentAlarms,
);

router.post(
  '/alarm/environment/name/:environmentName',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  addEnvironmentAlarm,
);

router.put(
  '/alarm/environment/name/:environmentName/alarm/name/:alarmName',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  editEnvironmentAlarm,
);

router.delete(
  '/alarm/environment/name/:environmentName/alarm/name/:alarmName',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  deleteEnvironmentAlarm,
);

router.post(
  '/alarm/environment/name/:environmentName/alarm/name/:alarmName/setState',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  setEnvironmentAlarmState,
);

// logs
router.post(
  '/log/environment/name/:environmentName/application/name/:applicationName/settings',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  enableLogsSettings,
);

module.exports = router;
