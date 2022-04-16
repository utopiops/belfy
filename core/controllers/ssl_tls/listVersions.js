'use strict';
const { handleRequest } = require('../helpers');
const sslTlsService = require("../../db/models/ssl_tls_certificate_v2/ssl_tls_certificate.service");

async function listVersions(req, res) {

	const handle = async () => {
        const { environmentId } = res.locals;
        const { certificateIdentifier } = req.params;      
		return await sslTlsService.listVersions(environmentId, certificateIdentifier);
	};
	const extractOutput = async (outputs) => outputs.versions;
	await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listVersions;
