const { handleRequest } = require('../helpers');
const staticWebsiteService = require('../../db/models/utopiops_application/staticWebsite.service');
const yup = require('yup');

async function checkNameAvailablity(req, res) {
  const validationSchema = yup.object().shape({
    name: yup.string().lowercase().strict().required()
  });

  const handle = async () => {
    const { name } = req.body;
    return await staticWebsiteService.checkNameAvailablity(name);
  };

  return handleRequest({ req, res, validationSchema, handle });
}

exports.handler = checkNameAvailablity;
