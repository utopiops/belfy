const { handleRequest } = require('../helpers');
const customDomainStaticWebsiteService = require('../../db/models/utopiops_application/customDomainStaticWebsite.service');
const yup = require('yup');
const constants = require('../../utils/constants');

async function createOrUpdateCustomDomainStaticWebsite(req, res) {
  // Schema validation
  const validationSchema = yup.object().shape({
    name: yup.string().lowercase().strict().required(),
    domainName: yup.string().required(),
    repositoryUrl: yup.string().url().strict().required(),
    integration_name: yup.string(),
    description: yup.string(),
    index_document: yup.string(),
    error_document: yup.string(),
    redirect_to_www: yup.boolean(),
    buildCommand: yup.string(),
    outputPath: yup.string().required(),
    branch: yup.string().required()
  });

	const handle = async () => {
    const { accountId, userId } = res.locals;

    // We handle multiple endpoints with this controller, so here we try to find out which path it is
    const isUpdate = req.method === 'PUT' ? true : false;
  
    // Add the new applications (in case of Create? or edit as well)

    let app = {
      ...req.body,
      accountId,
      createdBy: userId,
      kind: constants.applicationKinds.customDomainStatic,
    };

    if(isUpdate) {
      delete app.domainName
      delete app.repositoryUrl;
      delete app.domain;
      return await customDomainStaticWebsiteService.updateCustomDomainStaticWebsite(app, res.locals.headers);
    }
    else {
      return await customDomainStaticWebsiteService.createCustomDomainStaticWebsite(app);
    }
	};

  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = createOrUpdateCustomDomainStaticWebsite;
