"use strict";
const config = require('../../../utils/config').config;
const { handleRequest } = require('../../helpers');
const yup = require('yup');
const EnvironmentService = require('../../../db/models/environment/environment.service');

const locations = [
  'westus',
  'westus2',
  'eastus',
  'centralus',
  'centraluseuap',
  'southcentralus',
  'northcentralus',
  'westcentralus',
  'eastus2',
  'eastus2euap',
  'brazilsouth',
  'brazilus',
  'northeurope',
  'westeurope',
  'eastasia',
  'southeastasia',
  'japanwest',
  'japaneast',
  'koreacentral',
  'koreasouth',
  'southindia',
  'westindia',
  'centralindia',
  'australiaeast',
  'australiasoutheast',
  'canadacentral',
  'canadaeast',
  'uksouth',
  'ukwest',
  'francecentral',
  'francesouth',
  'australiacentral',
  'australiacentral2',
  'uaecentral',
  'uaenorth',
  'southafricanorth',
  'southafricawest',
  'switzerlandnorth',
  'switzerlandwest',
  'germanynorth',
  'germanywestcentral',
  'norwayeast',
  'norwaywest',
  'brazilsoutheast',
  'westus3',
  'swedencentral',
  'swedensouth'
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
    location: yup.string()
      .required()
      .oneOf(locations, "Must be a valid azure location"),
    description: yup.string()
      .max(100, "Maximum length is 100"),
    domain: yup.object().shape({
      dns: yup.string(),
      create: yup.boolean()
    }).required(),
    enableVnetDdosProtection: yup.boolean().required()
  });

  const handle = async () => {
    const { name, location, description, providerName, providerId, domain, enableVnetDdosProtection } = req.body;
    const { accountId, userId } = res.locals;
    // const tfCodePath = `${config.environmentsTerraformRootS3Bucket}/${accountId}/environments/${name}` todo: add tfCodePath to azure env
    return await EnvironmentService.addAzureEnvironment({ accountId, userId, name, location, description, providerName, providerId, domain, enableVnetDdosProtection });
  }
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = createEnvironment;
