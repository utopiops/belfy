"use strict";
const { handleRequest } = require("../helpers");
const sslTlsService = require("../../db/models/ssl_tls_certificate_v2/ssl_tls_certificate.service");

async function listEnvironment(req, res) {
	
  const handle = async () => {
    const { accountId } = res.locals;
    return await sslTlsService.listEnvironment(accountId);
  };
  const extractOutput = async (outputs) => outputs;
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listEnvironment;
