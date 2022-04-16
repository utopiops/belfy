"use strict";
const { handleRequest } = require('../helpers');
const providerService = require('../../db/models/provider/provider.service');
const yup = require('yup');


async function updateProviderStatus(req, res) {

  const validationSchema = yup.object().shape({
    status: yup.string().required(),
    kmsKeyId: yup.string()
  });
  const handle = async () => {
    const { accountId } = res.locals;
    const { status, kmsKeyId } = req.body;
    const { displayName, kind } = req.params;
    return await providerService.updateProviderStatus({ accountId, displayName, kind, status, kmsKeyId });
  }
  const extractOutput = async (outputs) => (outputs)
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = updateProviderStatus;
