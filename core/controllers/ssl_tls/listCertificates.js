'use strict';
const { handleRequest } = require('../helpers');
const sslTlsService = require("../../db/models/ssl_tls_certificate_v2/ssl_tls_certificate.service");

async function listCertificates(req, res) {

	const handle = async () => {
        const { accountId } = res.locals;
        const environmentName = req.params.environmentName;
		return await sslTlsService.list(accountId, environmentName);
	};
	const extractOutput = async (outputs) => outputs.certificates;
	await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listCertificates;
