'use strict';
const { handleRequest } = require('../helpers');
const sslTlsService = require("../../db/models/ssl_tls_certificate_v2/ssl_tls_certificate.service");

async function getCertificateDetails(req, res) {

	const handle = async () => {
        const { environmentId } = res.locals;
        const { certificateIdentifier, version } = req.params;    
		return await sslTlsService.getCertificateDetails(environmentId, certificateIdentifier, version);
	};
    const extractOutput = async (outputs) => outputs.certificateDetails;
	await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getCertificateDetails;
