"use strict";
const { handleRequest } = require('../helpers');
const yup = require('yup');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');

async function addNlb(req, res) {

  const validationSchema = yup.object().shape({
    displayName: yup.string()
      .required(),
    is_internal: yup.boolean()
      .required()
  });

  const handle = async () => {
    const { accountId, environmentName } = res.locals;
    const version = req.params.version;
    const isAdd = req.method === 'PUT' ? false : true;
    return await AwsEnvironmentService.addNlb(accountId, environmentName, version, isAdd, req.body.displayName, req.body.is_internal);
  }
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = addNlb;
