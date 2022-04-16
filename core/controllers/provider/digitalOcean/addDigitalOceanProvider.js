"use strict";
const { handleRequest } = require('../../helpers');
const providerService = require('../../../db/models/provider/provider.service');
const yup = require('yup');


async function addDigitalOceanProvider(req, res) {

  const validationSchema = yup.object().shape({
    displayName: yup.string().required(),
    region: yup.string().required()
      .oneOf(["nyc3", "ams3", "sfo3", "sgp1", "fra1"]),
    spacesAccessKeyId: yup.string().required(),
    spacesSecretAccessKey: yup.string().required(),
    digitalOceanToken: yup.string().required()
  });
  const handle = async () => {
    const { accountId, userId } = res.locals;
    const {
      displayName,
      region,
      spacesAccessKeyId,
      spacesSecretAccessKey,
      digitalOceanToken
     } = req.body;
    return await providerService.addDigitalOceanProvider({ accountId, userId, displayName, region, spacesAccessKeyId, spacesSecretAccessKey, digitalOceanToken });
  }
  const extractOutput = (outputs) => (outputs||{}).jobId
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = addDigitalOceanProvider;
