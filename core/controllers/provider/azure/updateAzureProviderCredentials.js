"use strict";
const { handleRequest } = require('../../helpers');
const providerService = require('../../../db/models/provider/provider.service');
const yup = require('yup');


async function updateAzureProviderCredentials(req, res) {

  const validationSchema = yup.object().shape({
    subscription: yup.string().required(),
    appId: yup.string().required(),
    tenant: yup.string().required(),
    password: yup.string().required()
  });
  const handle = async () => {
    const { accountId } = res.locals;
    const credentials = {
      subscription: req.body.subscription,
      appId: req.body.appId,
      tenant: req.body.tenant,
      password: req.body.password
    };
    const displayName = req.params.displayName;
    return await providerService.updateAzureProviderCredentials(accountId, displayName, credentials);
  }
  const extractOutput = async (outputs) => (outputs)
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = updateAzureProviderCredentials;
