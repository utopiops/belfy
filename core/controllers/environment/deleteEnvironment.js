"use strict";
const { handleRequest } = require('../helpers');
const EnvironmentService = require('../../db/models/environment/environment.service');

async function deleteEnvironment(req, res) {
  const handle = async () => {
    const { userId, environmentId, accountId } = res.locals;
    return await EnvironmentService.deleteEnvironment(accountId, userId, environmentId);
  }
  await handleRequest({ req, res, handle });
}

exports.handler = deleteEnvironment;
