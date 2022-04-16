'use strict';
const { handleRequest } = require('../helpers');
const sslTlsService = require("../../db/models/ssl_tls_certificate_v2/ssl_tls_certificate.service");

async function activateCertificate(req, res) {

	const handle = async () => {
		const { environmentId } = res.locals;
		const { certificateIdentifier, version } = req.params;
		return await sslTlsService.activateCertificate(environmentId, certificateIdentifier, version);
	};
	await handleRequest({ req, res, handle });
}

exports.handler = activateCertificate;
