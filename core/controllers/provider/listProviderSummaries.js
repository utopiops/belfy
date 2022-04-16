"use strict";
const { handleRequest } = require('../helpers');
const providerService = require('../../db/models/provider/provider.service');

async function listProviderSummaries(req, res) {
  const handle = async () => {
    const { accountId } = res.locals;
    const name = req.params.name;
    return await providerService.listProviderSummaries(accountId, name);
  }
  const extractOutput = async (outputs) => (outputs)
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listProviderSummaries;
