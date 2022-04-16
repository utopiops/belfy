"use strict";
const { handleRequest } = require('../helpers');
const yup = require('yup');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');

async function updateAlbListenerCertificate(req, res) {

  const validationSchema = yup.object().shape({
    certificateArn: yup.string()
      .required()
  });

  const handle = async () => {
    const { accountId, environmentName } = res.locals;
    const { version, albName, port } = req.params
    const isAdd = req.method === 'PUT' ? false : true;
    const certificateArn = req.body.certificateArn
    return await AwsEnvironmentService.updateAlbListenerCertificate(accountId, environmentName, version, isAdd, albName, port, certificateArn);
  }
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = updateAlbListenerCertificate;
