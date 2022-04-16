"use strict";
const { handleRequest } = require('../helpers');
const environmentService = require('../../db/models/environment/environment.service');

async function getEnvironmentDetails(req, res) {
  const handle = async () => {
    const { accountId, environmentName } = res.locals;
    const version = req.query.version
    const action = req.query.action
    return await environmentService.getEnvironmentDetailsVersion(accountId, environmentName, action, version);
  }
  const extractOutput = async (outputs) => (outputs)
  await handleRequest({ req, res,extractOutput, handle });
}

exports.handler = getEnvironmentDetails;
