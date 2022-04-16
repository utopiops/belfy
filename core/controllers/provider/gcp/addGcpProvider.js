"use strict";
const { handleRequest } = require('../../helpers');
const providerService = require('../../../db/models/provider/provider.service');
const yup = require('yup');


async function addGcpProvider(req, res) {

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
    "ASIA", // Data centers in Asia
    "EU", // Data centers within member states of the European Union
    "US", // Data centers in the United States
    "ASIA1", // ASIA-NORTHEAST1 and ASIA-NORTHEAST2.
    "EUR4", // EUROPE-NORTH1 and EUROPE-WEST4.
    "NAM4" // US-CENTRAL1 and US-EAST1.
  ]
  const validationSchema = yup.object().shape({
    displayName: yup.string().required(),
    region: yup.string().required()
      .oneOf(regions),
    projectId: yup.string().required(),
    serviceAccountKey: yup.object().required()
  });
  const handle = async () => {
    const { accountId, userId } = res.locals;
    const {
      displayName,
      region,
      projectId,
      serviceAccountKey,
    } = req.body;
    return await providerService.addGcpProvider({ accountId, userId, displayName, region, projectId, serviceAccountKey });
  }
  const extractOutput = (outputs) => (outputs||{}).jobId
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = addGcpProvider;
