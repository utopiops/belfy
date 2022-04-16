"use strict";
const { handleRequest } = require('../helpers');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');

async function getEnvironmentResources(req, res) {
  const handle = async () => {
    const { environmentName, credentials } = res.locals;
    const { bucketName, region } = res.locals.provider.backend
    const fields = req.query.fields
    return await AwsEnvironmentService.getEnvironmentResources(environmentName, credentials, region, bucketName, fields);
  }
  const extractOutput = async (outputs) => (outputs)
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getEnvironmentResources;
