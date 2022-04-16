"use strict";
const provider = require('../../db/models/provider');
const { handleRequest } = require('../helpers');

// TODO: this looks horrible! most likely wherever it's used has to change
async function getProvidersWithSameBackend(req, res) {
  const handle = async () => {
    return await provider.getSameTypeProviders(res.locals.accountId, res.locals.provider.backend.name, res.locals.provider.displayName);
  }

  const extractOutput = async (outputs) => ({ providers: outputs.providers })
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getProvidersWithSameBackend;
