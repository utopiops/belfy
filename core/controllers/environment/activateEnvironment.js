"use strict";
const { handleRequest } = require('../helpers');
const yup = require('yup');
const environmentService = require('../../db/models/environment/environment.service');

async function activateEnvironment(req, res) {
  const validationSchema = yup.object().shape({
    version: yup.number()
      .required()
  })

  const handle = async () => {
    const { accountId, environmentName, environmentId } = res.locals;
    const { version } = req.body
    return await environmentService.activateEnvironment(accountId, environmentName, environmentId, version);
  }
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = activateEnvironment;
