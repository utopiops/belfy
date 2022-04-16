"use strict";
const { handleRequest } = require('../helpers');
const providerService = require('../../db/models/provider/provider.service');


async function deleteProviderAfterJobDone(req, res) {

  const handle = async () => {
    const { accountId } = res.locals;
    const displayName = req.params.displayName;
    return await providerService.deleteProviderAfterJobDone({ accountId, displayName });
  }
  const extractOutput = (outputs) => outputs
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = deleteProviderAfterJobDone;