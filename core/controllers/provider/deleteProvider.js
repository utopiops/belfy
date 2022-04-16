"use strict";
const { handleRequest } = require('../helpers');
const providerService = require('../../db/models/provider/provider.service');


async function deleteProvider(req, res) {

  const handle = async () => {
    const { accountId, userId } = res.locals;
    const displayName = req.params.displayName;
    return await providerService.deleteProvider({ accountId, userId, displayName });
  }
  const extractOutput = (outputs) => outputs
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = deleteProvider;