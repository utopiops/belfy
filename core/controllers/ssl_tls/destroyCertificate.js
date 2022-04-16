"use strict";
const { handleRequest } = require("../helpers");
const yup = require('yup');
const sslTlsService = require("../../db/models/ssl_tls_certificate_v2/ssl_tls_certificate.service");

async function destroyCertificate(req, res) {
  const validationSchema = yup.object().shape({
    accessKeyId: yup.string(), // still not sure what to do with these
    secretAccessKey: yup.string(),
  });

  const handle = async () => {
    const { accountId, userId, environmentId, environmentName, provider, headers } = res.locals;
    const { bucketName, region } = res.locals.provider.backend
	  const { certificateIdentifier } = req.params;
	  const { accessKeyId, secretAccessKey } = res.locals.credentials;

    return await sslTlsService.destroyCertificate(
		accountId,
		userId,
		environmentId,
		environmentName,
		provider,
		certificateIdentifier,
    accessKeyId,
    secretAccessKey,
    bucketName,
    region,
    headers
    );
  };
  const extractOutput = async (outputs) => outputs;
  await handleRequest({ req, res, extractOutput, validationSchema, handle });
}

exports.handler = destroyCertificate;
