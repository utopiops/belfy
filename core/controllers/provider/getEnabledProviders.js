"use strict";
const { handleRequest } = require('../helpers');
const providerService = require('../../db/models/provider/provider.service');

async function getEnabledProviders(req, res) {
  const handle = async () => {
    const { accountId } = res.locals;
    return await providerService.getEnabledProviders(accountId);
  }
  const extractOutput = async (outputs) => (outputs)
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getEnabledProviders;
