const express     = require('express');
const router      = express.Router();
const controller  = require('./logmetricController');
const alarmController  = require('./alarmController');
const envAlarmController  = require('./environmentAlarmController');
const metricController  = require('./metricController');
const logController  = require('./logController');



router.get('/', controller.getLogMetric);
router.post('/', controller.addLogMetric);
router.patch('/:id', controller.editLogMetric);
router.delete('/:id', controller.deleteLogMetric);

// metrics
router.post('/metric/environment/name/:name/provider/cloudwatch', metricController.addMetricProviderCloudWatch);
router.get('/metric/environment/name/:name/provider', metricController.listMetricProviders);
router.delete('/metric/environment/name/:name/provider', metricController.deleteMetricProviders);



// alarms
router.post('/alarm/environment/sns', envAlarmController.handleSnsMessage); // Note: for no reason this handles both environment and application
router.get('/alarm/environment/name/:name', envAlarmController.listEnvironmentAlarms);
router.get('/alarm/environment/name/:name/predefined/type', envAlarmController.listPredefinedEnvironmentAlarmsTypes);
router.post('/alarm/environment/name/:name/predefined', envAlarmController.addPredefinedEnvironmentAlarm);
router.put('/alarm/environment/name/:name/predefined/name/:alarmName', envAlarmController.updatePredefineEnvironmentAlarm);
router.delete('/alarm/environment/name/:name/name/:alarmName', envAlarmController.deleteEnvironmentAlarm);
router.post('/alarm/environment/name/:name/name/:alarmName/deploy', envAlarmController.finishDeployAlarm);
router.post('/alarm/environment/name/:name/name/:alarmName/destroy', envAlarmController.finishDestroyAlarm);

router.get('/alarm/environment/name/:name/application/name/:applicationName/predefined/type', alarmController.listPredefinedApplicationAlarmsTypes);
router.get('/alarm/environment/name/:name/application/name/:applicationName', alarmController.listApplicationAlarms);
router.post('/alarm/environment/name/:name/application/name/:applicationName/predefined', alarmController.addPredefinedApplicationAlarm);
router.put('/alarm/environment/name/:name/application/name/:applicationName/predefined/name/:alarmName', alarmController.updatePredefineApplicationAlarm);
router.delete('/alarm/environment/name/:name/application/name/:applicationName/name/:alarmName', alarmController.deleteApplicationAlarm);
router.post('/alarm/environment/name/:name/application/name/:applicationName/name/:alarmName/deploy', alarmController.finishDeployAlarm);
router.post('/alarm/environment/name/:name/application/name/:applicationName/name/:alarmName/destroy', alarmController.finishDestroyAlarm);


// logs
router.post('/log/environment/name/:name/application/name/:applicationName/settings', logController.enableLogsSettings);

module.exports = router;
