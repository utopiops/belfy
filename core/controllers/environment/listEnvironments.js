"use strict";
const { handleRequest } = require('../helpers');
const EnvironmentService = require('../../db/models/environment/environment.service');


async function listEnvironment(req, res) {
  const handle = async () => {
    const { accountId } = res.locals;
    return await EnvironmentService.getEnvironmentsWithStatus(accountId);
  }

  const extractOutput = async (outputs) => outputs
    await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listEnvironment;
