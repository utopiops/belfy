"use strict";
const { handleRequest } = require('../helpers');
const yup = require('yup');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');

async function updateEcsClusterDependencies(req, res) {

  const validationSchema = yup.object().shape({
    dependencies: yup.object().shape({
      rdsNames: yup.array().of(yup.string())
        .unique('duplicate rds name'),
      albName: yup.string()
    }),
  });

  const handle = async () => {
    const { accountId, environmentName } = res.locals;
    const { version, clusterName } = req.params;
    const isAdd = req.method === 'PUT' ? false : true;
    const { dependencies } = req.body;
    return await AwsEnvironmentService.updateEcsClusterDependencies(accountId, environmentName, version, isAdd, clusterName, dependencies);
  }
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = updateEcsClusterDependencies;
