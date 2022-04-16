"use strict";
const { handleRequest } = require('../helpers');
const providerService = require('../../db/models/provider/provider.service');
const yup = require('yup');



async function testProvider(req, res) {

  const validationSchema = yup.object().shape({
    accessKeyId: yup.string().required(),
    secretAccessKey: yup.string().required()
  });

  const handle = async () => {
    const { accessKeyId, secretAccessKey } = req.body;
    return await providerService.testProvider(accessKeyId, secretAccessKey);
  }
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = testProvider;
