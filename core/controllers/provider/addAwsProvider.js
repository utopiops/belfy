"use strict";
const { handleRequest } = require('../helpers');
const providerService = require('../../db/models/provider/provider.service');
const yup = require('yup');


async function addAwsProvider(req, res) {

  const validationSchema = yup.object().shape({
    displayName: yup.string().required(),
    region: yup.string().required(), // Add oneOf validation
    accessKeyId: yup.string().required(),
    secretAccessKey: yup.string().required()
  });
  const handle = async () => {
    const { accountId, userId } = res.locals;
    const {
      displayName,
      region,
      accessKeyId,
      secretAccessKey } = req.body;
    return await providerService.addAwsProvider({ accountId, userId, displayName, region, accessKeyId, secretAccessKey });
  }
  const extractOutput = (outputs) => outputs.jobId + ""
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = addAwsProvider;
