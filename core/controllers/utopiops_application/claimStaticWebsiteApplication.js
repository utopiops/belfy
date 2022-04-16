const { handleRequest } = require('../helpers');
const staticWebsiteService = require('../../db/models/utopiops_application/staticWebsite.service');
const yup = require('yup');
const constants = require('../../utils/constants');

async function claimStaticWebsiteApplication(req, res) {
  // Schema validation
  const validationSchema = yup.object().shape({
    accountId: yup.string().required(),
  });

  const handle = async () => {
    const { accountId } = req.body;
    const { applicationName } = req.params;

    if (!res.locals.internal) {
      return {
        error: {
          StatusCode: constants.statusCodes.notAuthorized,
          Message: 'You are not authorized to perform this action.',
        },
      };
    }

    return await staticWebsiteService.claimStaticWebsiteApplication(accountId, applicationName);
  };

  return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = claimStaticWebsiteApplication;
