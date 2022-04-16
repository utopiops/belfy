"use strict";
const { handleRequest } = require('../helpers');
const certificateService = require('../../db/models/ssl_tls_certificate_v2/ssl_tls_certificate.service');

async function getCertificateResources(req, res) {
  const handle = async () => {
    const { environmentName, credentials } = res.locals;
    const { bucketName, region } = res.locals.provider.backend
    const { certificateIdentifier } = req.params
    const fields = req.query.fields
    return await certificateService.getCertificateResources(environmentName, certificateIdentifier, credentials, region, bucketName, fields);
  }
  const extractOutput = async (outputs) => (outputs)
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getCertificateResources;
