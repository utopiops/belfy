'use strict';
const { handleRequest } = require('../helpers');
const yup = require('yup');
const cron = require('cron-validator');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');
yup.addMethod(yup.string, 'isValidCron', function (message = "It's not a valid cron") {
  return this.test('test-cron', message, function (value) {
    return cron.isValidCron(value, { seconds: true, alias: true, allowBlankDay: true });
  });
});

async function addOrUpdateSchedule(req, res) {
	const validationSchema = yup.object().shape({
		start_schedule: yup.string().isValidCron().required(),
		stop_schedule: yup.string().isValidCron().required()
	});

	const handle = async () => {
		const { accountId, environmentName } = res.locals;
		const version = req.params.version;
		const isAdd = req.method === 'PUT' ? false : true;
		const { start_schedule, stop_schedule } = req.body;
		return await AwsEnvironmentService.addOrUpdateSchedule(accountId, environmentName, version, isAdd, start_schedule, stop_schedule);
	};
	await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = addOrUpdateSchedule;
