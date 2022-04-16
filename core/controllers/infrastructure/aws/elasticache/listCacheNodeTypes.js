const { handleRequest } = require('../../../helpers');
const { filterCacheNodeTypes } = require('./filterCacheNodeTypes');
const yup = require('yup');

async function listCacheNodeTypes(req, res) {
  const validationSchema = yup.object().shape({
    engine_version: yup.string().required(),
  });
  const handle = async () => {
    const { engine_version } = req.body;
    const cacheNodeTypes = filterCacheNodeTypes(engine_version);
    return {
      success: true,
      outputs: cacheNodeTypes,
    }
  };
  const extractOutput = async (outputs) => outputs;
  await handleRequest({ req, res, validationSchema, extractOutput, handle });
}

exports.handler = listCacheNodeTypes;
