"use strict";
const { handleRequest } = require('../helpers');
const yup = require('yup');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');
yup.addMethod(yup.array, 'unique', function (message, mapper = a => a) {
  return this.test('unique', message, function (list) {
    return list.length === new Set(list.map(mapper)).size;
  });
});

async function addEcsCluster(req, res) {

  const validationSchema = yup.object().shape({
    displayName: yup.string()
      .required()
  });

  const handle = async () => {
    const { accountId, environmentName } = res.locals;
    const { displayName } = req.body;
    const version = req.params.version;
    const isAdd = req.method === 'PUT' ? false : true;
    return await AwsEnvironmentService.addEcsCluster(accountId, environmentName, version, isAdd, displayName);
  }
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = addEcsCluster;