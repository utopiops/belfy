const { handleRequest } = require('../helpers');
const staticWebsiteService = require('../../db/models/utopiops_application/staticWebsite.service');
const yup = require('yup');
const constants = require('../../utils/constants');

async function createOrUpdateStaticWebsiteApplication(req, res) {
  // Schema validation
  const validationSchema = yup.object().shape({
    name: yup.string().lowercase().strict().required(),
    repositoryUrl: yup.string().url().strict().required(),
    integration_name: yup.string(),
    description: yup.string(),
    index_document: yup.string(),
    error_document: yup.string(),
    buildCommand: yup.string(),
    outputPath: yup.string().required(),
    branch: yup.string().required()
  });

	const handle = async () => {
    const accountId = res.locals.accountId;

    // We handle multiple endpoints with this controller, so here we try to find out which path it is
    const isUpdate = req.method === 'PUT' ? true : false;

    let app = {
      ...req.body,
      accountId,
      kind: constants.applicationKinds.staticWebsite,
    };

    if(isUpdate) {
      delete app.repositoryUrl;
      delete app.domain;
      delete app.type;
      return await staticWebsiteService.updateStaticWebsiteApplication(app, res.locals.headers);
    }
    else {
      return await staticWebsiteService.createStaticWebsiteApplication(app, res.locals.headers);
    }
	};

	return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = createOrUpdateStaticWebsiteApplication;
