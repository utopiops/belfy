"use strict";
const { handleRequest } = require('../helpers');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');

async function deleteEcsCluster(req, res) {

  const handle = async () => {
    const { accountId, environmentName } = res.locals;
    const { version, clusterName } = req.params;
    const isAdd = req.query.mode == 'edit' ? false : true;
    return await AwsEnvironmentService.deleteEcsCluster(accountId, environmentName, version, isAdd, clusterName);
  }
  await handleRequest({ req, res, handle });
}

exports.handler = deleteEcsCluster;
