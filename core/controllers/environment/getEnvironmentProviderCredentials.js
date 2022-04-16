"use strict";
const { handleRequest } = require('../helpers');

async function getEnvironmentProviderCredentials(req, res) {
  const handle = async () => {
    return {
      success: true,
      outputs: {
        credentials: res.locals.credentials
      }
    };
  }

  const extractOutput = async (outputs) => ({ credentials: outputs.credentials })
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = getEnvironmentProviderCredentials;
