"use strict";
const { handleRequest } = require('../helpers');
const UtopiopsApplicationService = require('../../db/models/utopiops_application/utopiopsApplication.service');

async function destroyApplication(req, res) {

  const extractOutput = async (outputs) => (outputs);

  const handle = async () => {
    const { accountId } = res.locals;
    const { applicationName } = req.params;
    return await UtopiopsApplicationService.destroyApplication(accountId, applicationName);
  }
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = destroyApplication;
