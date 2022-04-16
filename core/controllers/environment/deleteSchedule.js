"use strict";
const { handleRequest } = require('../helpers');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');

async function deleteSchedule(req, res) {
  const handle = async () => {
    const { accountId, environmentName } = res.locals;
    const { version } = req.params
    const isAdd = req.query.mode === 'edit' ? false : true;
    return await AwsEnvironmentService.deleteSchedule(accountId, environmentName, version, isAdd);
  }
  await handleRequest({ req, res, handle });
}

exports.handler = deleteSchedule;