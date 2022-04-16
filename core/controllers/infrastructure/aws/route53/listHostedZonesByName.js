const { handleRequest } = require("../../../helpers");
const { handleAwsRequest } = require('../helpers');
const { getRoute53 } = require('./getRoute53');
const jmespath = require('jmespath');

const search = (data, query) => query ? jmespath.search(data, query) : data;

async function listHostedZonesByName(req, res) {
  const query = req.query.query;
  const handle = async () => {
    const { credentials } = res.locals;
    if (!credentials) { // This indicates that the credentials are not set
        return {
          success: false
        }
    }
    const region = res.locals.provider.backend.region;

    const baseConfig = {
        credentials,
        region,
    };

    const route53 = getRoute53(baseConfig);

    const fn = () => route53.listHostedZonesByName().promise();
    return await handleAwsRequest({fn});
  };

  const extractOutput = async (outputs) => {
    return search(outputs, query);
  };
  return await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = listHostedZonesByName;