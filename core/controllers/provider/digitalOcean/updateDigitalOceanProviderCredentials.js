"use strict";
const { handleRequest } = require('../../helpers');
const providerService = require('../../../db/models/provider/provider.service');
const yup = require('yup');


async function updateDigitalOceanProviderCredentials(req, res) {

  const validationSchema = yup.object().shape({
    digitalOceanToken: yup.string().required(),
    spacesAccessKeyId: yup.string().required(),
    spacesSecretAccessKey: yup.string().required()
  });
  const handle = async () => {
    const { accountId } = res.locals;
    const credentials = {
      digitalOceanToken: req.body.digitalOceanToken,
      spacesAccessKeyId: req.body.spacesAccessKeyId,
      spacesSecretAccessKey: req.body.spacesSecretAccessKey,
    };
    const displayName = req.params.displayName;
    return await providerService.updateDigitalOceanProviderCredentials(accountId, displayName, credentials);
  }
  const extractOutput = async (outputs) => (outputs)
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = updateDigitalOceanProviderCredentials;
