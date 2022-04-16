const { handleRequest } = require('../helpers');
const functionService = require('../../db/models/utopiops_application/function.service');
const yup = require('yup');
const constants = require('../../utils/constants');

async function createOrUpdateFunctionApplication(req, res) {
  // Schema validation
  const validationSchema = yup.object().shape({
    name: yup.string().lowercase().strict().required(),
    integration_name: yup.string(),
    branch: yup.string().required(),
    repositoryUrl: yup.string().url().strict().required(),
    description: yup.string(),
  });

	const handle = async () => {
    const accountId = res.locals.accountId;
    const isUpdate = req.method === 'PUT' ? true : false;
  
    let app = {
      ...req.body,
      accountId,
      kind: constants.applicationKinds.function,
    };

    if(isUpdate) {
      delete app.domainName
      delete app.repositoryUrl;
      delete app.domain;
      delete app.integrationName;
      return await functionService.updateFunctionApplication(app, res.locals.headers);
    }
    else {
      return await functionService.createFunctionApplication(app, res.locals.headers);
    }

	};

	return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = createOrUpdateFunctionApplication;
