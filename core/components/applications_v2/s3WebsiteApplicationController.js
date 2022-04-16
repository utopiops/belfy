const EnvironmentApplication = require('../../db/models/environment_application/application');
const EnvironmentModel = require('../../db/models/environment_application/environment');
const constants = require('../../utils/constants');
const tokenService = require('../../utils/auth/tokenService');
const yup = require('yup');

exports.createOrUpdateS3WebsiteApplication = createOrUpdateS3WebsiteApplication;

//------------------------------------------------
async function createOrUpdateS3WebsiteApplication(req, res, next) {
  const accountId = tokenService.getAccountIdFromToken(req);
  const userId = tokenService.getUserIdFromToken(req);
  const environmentName = req.params.name;

  // We handle multiple endpoints with this controller, so here we try to find out which path it is
  const isFirstVersion = req.originalUrl.endsWith('application/s3web') ? true : false;
  const isUpdate = req.method === 'PUT' ? true : false;
  let version = 0;
  if (!isFirstVersion) {
    version = req.params.version;
  }

  // Schema validation
  const validationSchema = yup.object().shape({
    name: yup.string()
      .required(),
    description: yup.string(),
    redirect: yup.bool(),
    indexDocument: yup.string(),
    errorDocument: yup.string(),
    acmCertificateArn: yup.string()
      .required()
  });
  try {
    validationSchema.validateSync(req.body);
  } catch (err) {
    res.status(constants.statusCodes.ue).send(err.message);
    return;
  }

  // Check if the environment exist and it's provider is aws and get it's id
  let environmentId, providerName;
  try {
    let result = await EnvironmentModel.getEnvironmentIdAndProvider(accountId, environmentName);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
      return
    } else {
      environmentId = result.output.id;
      providerName = result.output.providerName;
      if (providerName !== constants.applicationProviders.aws) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
    }
  } catch (error) {
    console.error(error.message);
    res.sendStatus(constants.statusCodes.ise);
  }

  try {

    // Add the new applications (in case of Create? or edit as well)

    let appVersion = {
      ...req.body,
      kind: constants.applicationKinds.s3Website,
      createdBy: userId
    };

    if (isUpdate) {
      appVersion.version = version;
    } else if (!isFirstVersion) {
      appVersion.fromVersion = version;
    }

    let result = isFirstVersion ?
      await EnvironmentApplication.createS3WebsiteApplication(environmentId, appVersion.name, appVersion.description, appVersion) :
      isUpdate ?
        await EnvironmentApplication.updateS3WebsiteApplication(environmentId, appVersion.name, appVersion.description, appVersion) :
        await EnvironmentApplication.addS3WebsiteApplicationVersion(environmentId, appVersion.name, appVersion.description, appVersion, version);
    if (!result.success) {
      if (result.message == constants.errorMessages.models.elementNotFound) {
        res.sendStatus(constants.statusCodes.badRequest);
        return;
      }
      res.sendStatus(constants.statusCodes.ise);
    } else {
      res.sendStatus(constants.statusCodes.ok);
    }
  } catch (e) {
    console.log(e.message);
    res.sendStatus(constants.statusCodes.ise);
  }
}
