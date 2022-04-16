"use strict";
const { handleRequest } = require('../helpers');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');

async function deleteNlb(req, res) {
  const handle = async () => {
    const { accountId, environmentName } = res.locals;
    const { version, nlbName } = req.params
    const isAdd = req.query.mode === 'edit' ? false : true;
    return await AwsEnvironmentService.deleteNlb(accountId, environmentName, version, isAdd, nlbName);
  }
  await handleRequest({ req, res, handle });
}

exports.handler = deleteNlb;