"use strict";
const config = require('../../../utils/config').config;
const { handleRequest } = require('../../helpers');
const yup = require('yup');
const EnvironmentService = require('../../../db/models/environment/environment.service');

const regions = [
  "NORTHAMERICA-NORTHEAST1", // Montréal
  "NORTHAMERICA-NORTHEAST2", // Toronto
  "US-CENTRAL1", // Iowa
  "US-EAST1", // South Carolina
  "US-EAST4", // Northern Virginia
  "US-WEST1", // Oregon
  "US-WEST2", // Los Angeles
  "US-WEST3", // Salt Lake City
  "US-WEST4", // Las Vegas
  "SOUTHAMERICA-EAST1", // São Paulo
  "SOUTHAMERICA-WEST1", // Santiago
  "EUROPE-CENTRAL2", // Warsaw
  "EUROPE-NORTH1", // Finland
  "EUROPE-WEST1", // Belgium
  "EUROPE-WEST2", // London
  "EUROPE-WEST3", // Frankfurt
  "EUROPE-WEST4", // Netherlands
  "EUROPE-WEST6", // Zürich
  "ASIA-EAST1", // Taiwan
  "ASIA-EAST2", // Hong Kong
  "ASIA-NORTHEAST1", // Tokyo
  "ASIA-NORTHEAST2", // Osaka
  "ASIA-NORTHEAST3", // Seoul
  "ASIA-SOUTH1", // Mumbai
  "ASIA-SOUTH2", // Delhi
  "ASIA-SOUTHEAST1", // Singapore
  "ASIA-SOUTHEAST2", // Jakarta
  "AUSTRALIA-SOUTHEAST1", // Sydney
  "AUSTRALIA-SOUTHEAST2", // Melbourne
]

async function createEnvironment(req, res) {

  const validationSchema = yup.object().shape({
    providerId: yup.string()
      .required(),
    providerName: yup.string()
      .required(),
    name: yup.string()
      .required()
      .min(3, "A minimum of 3 characters is required")
      .max(16, "Maximum length is 16")
      .matches(/^(?!\W)[a-z]+[a-z0-9-]*(?<!\W)$/, 'invalid environment name'),
    region: yup.string()
      .required()
      .oneOf(regions, "Must be a valid gcp location"),
    description: yup.string()
      .max(100, "Maximum length is 100"),
    dns: yup.object().shape({
      is_own: yup.boolean(),
      is_cross_account: yup.boolean(),
      parent_domain: yup.string()
    }).required()
  });

  const handle = async () => {
    const { name, region, description, providerName, providerId, dns } = req.body;
    const { accountId, userId } = res.locals;
    // const tfCodePath = `${config.environmentsTerraformRootS3Bucket}/${accountId}/environments/${name}` todo: add tfCodePath to gcp env
    return await EnvironmentService.addGcpEnvironment({ accountId, userId, name, region, description, providerName, providerId, dns });
  }
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = createEnvironment;
