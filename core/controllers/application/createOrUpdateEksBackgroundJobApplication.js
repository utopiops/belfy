const { handleRequest } = require('../helpers');
const EksBackgroundJobApplicationService = require('../../db/models/application/eksBackgroundJobApplication.service');
const yup = require('yup');
const constants = require('../../utils/constants');

async function createOrUpdateEksBackgroundJobApplication(req, res) {
  // Schema validation
  const validationSchema = yup.object().shape({
    app_name: yup.string().lowercase().strict()
    .test('has-right-length', 'Total length of application name and domain name should be less than or equal to 40', (value) => {
      return value.length <= 40;
    })
    .required(),
    eks_cluster_name: yup.string().required(),
    description: yup.string(),
    cpu: yup.number().min(0.01).max(2).required(),
    repositoryUrl: yup.string().url().required(),
    memory: yup.number().min(1).max(2048).required(),
    branch: yup.string().required(),
    health_check_path: yup.string(),
    environmentVariables: yup.array().of(
      yup.object().shape({
        name: yup.string().required(),
        value: yup.string().required(),
      }),
    )
  });  

	const handle = async () => {
    const { userId, accountId, environmentId, credentials } = res.locals;
    const providerName = res.locals.provider.backend.name;
    const { environmentName } = req.params;
    const { region, cloudProviderAccountId, bucketName } = res.locals.provider.backend;

    const newAppDetails = req.body;
  
    const isFirstVersion = req.originalUrl.endsWith('application/eksbackground') ? true : false;
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
  
    // todo: check if the albId and clusterId are valid
    // todo: add validation
    let appVersion = {
      kind: constants.applicationKinds.eksBackgroundJob,
      createdBy: userId,
      eks_cluster_name: newAppDetails.eks_cluster_name,
      memory: newAppDetails.memory,
      cpu: newAppDetails.cpu,
      environmentVariables: newAppDetails.environmentVariables,
      health_check_command: newAppDetails.health_check_command,
      jobName: newAppDetails.repositoryUrl ? `${req.body.app_name}-${environmentName}-${accountId}` : '',
      repositoryUrl: newAppDetails.repositoryUrl,
      integrationName: newAppDetails.integrationName,
      branch: newAppDetails.branch
    };

    const isDynamicApplication = newAppDetails.is_dynamic_application

    if (isUpdate) {
      appVersion.version = version;
    } else if (!isFirstVersion) {
      appVersion.fromVersion = version;
    }


    return isFirstVersion
      ? await EksBackgroundJobApplicationService.createEksBackgroundJobApplication(
          environmentId,
          environmentName,
          accountId,
          userId,
          newAppDetails.app_name,
          newAppDetails.description,
          isDynamicApplication,
          appVersion,
          credentials,
          region,
          cloudProviderAccountId,
          bucketName,
          res.locals.headers,
        )
      : isUpdate
      ? await EksBackgroundJobApplicationService.updateEksBackgroundJobApplication(
          environmentId,
          newAppDetails.app_name,
          newAppDetails.description,
          appVersion,
        )
      : await EksBackgroundJobApplicationService.addEksBackgroundJobApplicationVersion(
          environmentId,
          newAppDetails.app_name,
          newAppDetails.description,
          appVersion,
          version,
        );
	};
  
  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = createOrUpdateEksBackgroundJobApplication;
