"use strict";
const { handleRequest } = require('../helpers');
const environmentService = require('../../db/models/environment/environment.service');

async function getEnvironmentDetails(req, res) {

  const handle = async () => {
    const { accountId, environmentName } = res.locals;
    return await environmentService.getEnvironmentDetails(accountId, environmentName);
  }
  const extractOutput = async (outputs) => (outputs)
  await handleRequest({ req, res,extractOutput, handle });
}

exports.handler = getEnvironmentDetails;
