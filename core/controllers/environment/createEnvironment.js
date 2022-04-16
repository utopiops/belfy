"use strict";
const config = require('../../utils/config').config;
const { handleRequest } = require('../helpers');
const yup = require('yup');
const EnvironmentService = require('../../db/models/environment/environment.service');
const regions = require('../../utils/awsRegions');

yup.addMethod(yup.array, 'unique', function (message, mapper = a => a) {
  return this.test('unique', message, function (list) {
    return list.length === new Set(list.map(mapper)).size;
  });
});

async function createEnvironment(req, res) {

  const validationSchema = yup.object().shape({
    providerId: yup.string()
      .required(),
    name: yup.string()
      .required()
      .min(3, "A minimum of 3 characters is required")
      .max(16, "Maximum length is 16")
      .matches(/^(?!\W)[a-z]+[a-z0-9-]*(?<!\W)$/, 'invalid environment name')
      .lowercase()
      .strict(),
    region: yup.string()
      .required()
      .oneOf(regions, "Must be a valid aws region"),
    description: yup.string()
      .max(100, "Maximum length is 100"),
    providerName: yup.string().required(),
    domain: yup.object().shape({
      dns: yup.string(),
      create: yup.boolean()
    }).required(),
  });

  const handle = async () => {
    const { name, region, description, providerName, providerId, domain } = req.body;
    const { accountId, userId } = res.locals;
    const tfCodePath = `${config.environmentsTerraformRootS3Bucket}/${accountId}/environments/${name}`
    return await EnvironmentService.addAwsEnvironment({ accountId, userId, name, region, description, providerName, tfCodePath, providerId, domain });
  }
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = createEnvironment;
