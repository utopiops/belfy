const { handleRequest } = require('../helpers');
const sslTlsService = require("../../db/models/ssl_tls_certificate_v2/ssl_tls_certificate.service");

async function getCertificateSummary(req, res) {
	const handle = async () => {
    const { environmentId } = res.locals;
    const { certificateIdentifier } = req.params

		return await sslTlsService.getCertificateSummary(environmentId, certificateIdentifier);
	};

  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, handle, extractOutput });
}

exports.handler = getCertificateSummary;
