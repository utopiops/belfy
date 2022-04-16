const { handleRequest } = require('../helpers');
const yup = require('yup');
const AwsEnvironmentService = require('../../db/models/environment/awsEnvironment.service');

const managed_rules = [
	'AWS_AWSManagedRulesCommonRuleSet',
	'AWS_AWSManagedRulesAmazonIpReputationList',
	'AWS_AWSManagedRulesKnownBadInputsRuleSet',
	'AWS_AWSManagedRulesSQLiRuleSet',
	'AWS_AWSManagedRulesLinuxRuleSet',
	'AWS_AWSManagedRulesUnixRuleSet',
	'AWS_AWSManagedRulesBotControlRuleSet'
];

async function setAlbWaf(req, res) {
	const validationSchema = yup.object().shape({
    alb_waf: yup.object().shape({
      rate_limit: yup.number().required(),
      managed_rules: yup.array().of(yup.string().oneOf(managed_rules)).unique('duplicate rules').required()
    }).nullable()
	});

	const handle = async () => {
		const { accountId, environmentName } = res.locals;
    const version = req.params.version;
    const isAdd = req.method === 'PUT' ? false : true;
		return await AwsEnvironmentService.setAlbWaf(accountId, environmentName, version, isAdd, req.body.alb_waf);
	};
	await handleRequest({ req, res, validationSchema, handle });
}

exports.handler = setAlbWaf;
