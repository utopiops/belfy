const { handleRequest } = require('../helpers');
const S3WebsiteService = require('../../db/models/application/s3WebsiteApplication.service');
const EscService = require('../../db/models/application/ecsApplication.service');
const { getApplicationKind } = require('../../db/models/application/application.service');
const yup = require('yup');
const constants = require('../../utils/constants');


async function createCiJob(req, res, next) {
  const validationSchema = yup.object().shape({
    dynamicName: yup.string(),
		kind: yup.string()
	});

	const handle = async () => {
    const { accountId, userId, environmentId, credentials } = res.locals;
    const { region, cloudProviderAccountId } = res.locals.provider.backend;
    const { applicationName } = req.params;
		const { dynamicName } = req.body;

    const result = await getApplicationKind(environmentId, applicationName);
    if (!result.success) {
      return result;
    }
    const kind = result.output.kind;

    if (dynamicName) {
      switch (kind) {
        case constants.applicationKinds.s3Website :
          return await S3WebsiteService.createDynamicApplicationPipeline(accountId, userId, environmentId, applicationName, dynamicName, credentials, res.locals.headers);
        case constants.applicationKinds.ecs :
          return await EscService.createDynamicApplicationPipeline(accountId, userId, environmentId, applicationName, dynamicName, region, cloudProviderAccountId, credentials, res.locals.headers);
        default:
          return {
            error: {
              message: 'Invalid application kind',
              statusCode: constants.statusCodes.badRequest
            }
          }
      }
    } else {
      switch (kind) {
        case constants.applicationKinds.s3Website :
          return await S3WebsiteService.createPipeline(accountId, userId, environmentId, applicationName, credentials, res.locals.headers);
        case constants.applicationKinds.ecs :
          return await EscService.createPipeline(accountId, userId, environmentId, applicationName, region, cloudProviderAccountId, credentials, res.locals.headers);
        default:
          return {
            error: {
              message: 'Invalid application kind',
              statusCode: constants.statusCodes.badRequest
            }
          }
      }
    }
	};

	return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = createCiJob;
