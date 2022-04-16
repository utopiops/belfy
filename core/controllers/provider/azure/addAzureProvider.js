"use strict";
const { handleRequest } = require('../../helpers');
const providerService = require('../../../db/models/provider/provider.service');
const yup = require('yup');

/*
setup: 
  1. run `az ad sp create-for-rbac --role="Contributor"`
  2. take note of appId, tenant and password and pass to this endpoint
*/

async function addAzureProvider(req, res) {

  const validationSchema = yup.object().shape({
    displayName: yup.string().required(),
    subscription: yup.string().required(),
    appId: yup.string().required(),
    tenant: yup.string().required(),
    password: yup.string().required(),
    location: yup.string().required()
      .oneOf([
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
      ])
  });
  const handle = async () => {
    const { accountId, userId } = res.locals;
    const {
      displayName,
      subscription,
      appId,
      tenant,
      password,
      location
     } = req.body;
    return await providerService.addAzureProvider({ accountId, userId, displayName, subscription, appId, tenant, password, location });
  }
  const extractOutput = (outputs) => (outputs||{}).jobId
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = addAzureProvider;
