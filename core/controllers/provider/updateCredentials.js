"use strict";
const { handleRequest } = require('../helpers');
const providerService = require('../../db/models/provider/provider.service');
const yup = require('yup');


async function updateCredentials(req, res) {

  const validationSchema = yup.object().shape({
    accessKeyId: yup.string().required(),
    secretAccessKey: yup.string().required()
  });
  const handle = async () => {
    const { accountId } = res.locals;
    const credentials = {
      accessKeyId: req.body.accessKeyId,
      secretAccessKey: req.body.secretAccessKey,
    };
    const displayName = req.params.displayName;
    return await providerService.updateCredentials(accountId, displayName, credentials);
  }
  const extractOutput = async (outputs) => (outputs)
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = updateCredentials;
