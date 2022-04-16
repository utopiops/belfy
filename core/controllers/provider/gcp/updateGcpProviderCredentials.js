"use strict";
const { handleRequest } = require('../../helpers');
const providerService = require('../../../db/models/provider/provider.service');
const yup = require('yup');


async function updateGcpProviderCredentials(req, res) {

  const validationSchema = yup.object().shape({
    serviceAccountKey: yup.object().required()
  });
  const handle = async () => {
    const { accountId } = res.locals;
    const credentials = {
      serviceAccountKey: req.body.serviceAccountKey
    };
    const displayName = req.params.displayName;
    return await providerService.updateGcpProviderCredentials(accountId, displayName, credentials);
  }
  const extractOutput = async (outputs) => (outputs)
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = updateGcpProviderCredentials;
