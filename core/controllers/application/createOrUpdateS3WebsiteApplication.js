const { handleRequest } = require('../helpers');
const S3WebsiteService = require('../../db/models/application/s3WebsiteApplication.service');
const yup = require('yup');
const constants = require('../../utils/constants');

async function createOrUpdateS3WebsiteApplication(req, res) {

  // Schema validation
  const validationSchema = yup.object().shape({
    app_name: yup.string().lowercase().strict().required(),
    description: yup.string(),
    redirect_to_www: yup.bool(),
    index_document: yup.string(),
    error_document: yup.string(),
    acm_certificate_arn: yup.string().required(),
    repositoryUrl: yup.string().url().strict(),
    integrationName: yup.string(),
    buildCommand: yup.string(),
    outputPath: yup.string(),
    branch: yup.string()
  });

	const handle = async () => {
    const { userId, accountId, environmentId } = res.locals;
    const providerName = res.locals.provider.backend.name;
    const { environmentName } = req.params;

    // We handle multiple endpoints with this controller, so here we try to find out which path it is
    const isFirstVersion = req.originalUrl.endsWith('application/s3web') ? true : false;
    const isUpdate = req.method === 'PUT' ? true : false;
    let version = 0;
    if (!isFirstVersion) {
      version = req.params.version;
    }

    
    if (providerName !== constants.applicationProviders.aws) {
      return {
        success: false,
        error: {
          message: 'Invalid provider name',
          statusCode: constants.statusCodes.badRequest
        }
      }
    }
  
    // Add the new applications (in case of Create? or edit as well)

    delete req.body._id;
    let appVersion = {
      ...req.body,
      kind: constants.applicationKinds.s3Website,
      jobName: req.body.repositoryUrl ? `${req.body.app_name}-${environmentName}-${accountId}` : '',
      createdBy: userId
    };

    if (isUpdate) {
      appVersion.version = version;
    } else if (!isFirstVersion) {
      appVersion.fromVersion = version;
    }

    // User can't activate the application through this endpoint
    delete appVersion.isActivated;

    return isFirstVersion ?
      await S3WebsiteService.createS3WebsiteApplication(environmentId, appVersion.app_name, appVersion.description, appVersion, req.body.isDynamicApplication) :
      isUpdate ?
        await S3WebsiteService.updateS3WebsiteApplication(environmentId, appVersion.app_name, appVersion.description, appVersion) :
        await S3WebsiteService.addS3WebsiteApplicationVersion(environmentId, appVersion.app_name, appVersion.description, appVersion, version);
	};
  
  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = createOrUpdateS3WebsiteApplication;
