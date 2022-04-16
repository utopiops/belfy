"use strict";
const { handleRequest } = require('../helpers');
const providerService = require('../../db/models/provider/provider.service');

async function getProviderCredentials(req, res) {
  const handle = async () => {
    const { accountId } = res.locals;
    const displayName = req.params.displayName;
    return await providerService.getProviderCredentials(accountId, displayName);
  }
  const extractOutput = async (outputs) => (outputs)
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getProviderCredentials;