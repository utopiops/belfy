'use strict';
const { handleRequest } = require('../helpers');
const sslTlsService = require("../../db/models/ssl_tls_certificate_v2/ssl_tls_certificate.service");

async function deleteCertificate(req, res) {

	const handle = async () => {
        const { environmentId } = res.locals;
        const { certificateIdentifier } = req.params;      
		return await sslTlsService.deleteCertificate(environmentId, certificateIdentifier);
	};
	await handleRequest({ req, res, handle });
}

exports.handler = deleteCertificate;
