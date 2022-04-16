"use strict";
const { handleRequest } = require('../helpers');
const environmentService = require('../../db/models/environment/environment.service');

async function dryRunEnvironment(req, res) {

  const extractOutput = async (outputs) => (outputs);

  const handle = async () => {
    const { accountId, userId, environmentName, provider, credentials, headers } = res.locals;
    const version = req.params.version;
    return await environmentService.dryRunEnvironment(accountId, userId, environmentName, version, provider, credentials, headers);
  }
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = dryRunEnvironment;
