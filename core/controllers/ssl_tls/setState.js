"use strict";
const { handleRequest } = require("../helpers");
const yup = require('yup');
const sslTlsService = require("../../db/models/ssl_tls_certificate_v2/ssl_tls_certificate.service");

async function setState(req, res) {
  const validationSchema = yup.object().shape({
    code: yup
      .string()
      .oneOf(["deployed", "deploy_failed", "destroyed", "destroy_failed"])
      .required(),
    job: yup.string().required(),
  });

  const handle = async () => {
    const { environmentId } = res.locals;
    const { certificateIdentifier } = req.params;
    const state = req.body;

    return await sslTlsService.setState(
      environmentId,
      certificateIdentifier,
      state
    );
  };
  await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = setState;
