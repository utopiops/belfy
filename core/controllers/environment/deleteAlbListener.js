"use strict";
const { handleRequest } = require('../helpers');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');

async function deleteAlbListener(req, res) {

  const handle = async () => {
    const { accountId, environmentName } = res.locals;
    const { version, albName, port } = req.params;
    const isAdd = req.query.mode === 'edit' ? false : true;
    return await AwsEnvironmentService.deleteAlbListener(accountId, environmentName, version, isAdd, albName, port);
  }
  await handleRequest({ req, res, handle });
}

exports.handler = deleteAlbListener;
