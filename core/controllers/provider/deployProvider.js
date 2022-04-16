"use strict";
const { handleRequest } = require('../helpers');
const providerService = require('../../db/models/provider/provider.service');

async function deployProvider(req, res) {

  const handle = async () => {
    const { accountId, userId } = res.locals;
    const displayName = req.params.displayName;
    return await providerService.deployProvider(accountId, userId, displayName);
  }
  const extractOutput = (outputs) => outputs.jobId + ""
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = deployProvider;


