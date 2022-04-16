const AWSEnvironmentService = require('../../db/models/environment/awsEnvironment.service');
const { handleRequest } = require('../helpers');
const yup = require('yup');

async function addListenerToAlb(req, res) {

	const validationSchema = yup.object().shape({
		port: yup.number().required(),
		protocol: yup.string().required().oneOf([ 'http', 'https' ]),
		certificateArn: yup.string().when('protocol', {
			is: (v) => v === 'https',
			then: yup.string().required()
		})
	});

	const handle = async () => {
    const { accountId, environmentName } = res.locals;
    const { version, albName } = req.params;
		const { port, protocol, certificateArn = "" } = req.body;
		const isAdd = req.method === 'POST' ? true : false;

		return await AWSEnvironmentService.addListenerToAlb(
			accountId,
			environmentName,
			version,
			isAdd,
			albName,
			port,
			protocol.toUpperCase(),
			certificateArn
		);
	};

	await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = addListenerToAlb;
