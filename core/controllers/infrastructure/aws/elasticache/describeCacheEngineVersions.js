const { handleRequest } = require('../../../helpers');
const { getElastiCache } = require('./getElastiCache');
const { handleAwsRequest } = require('../helpers');

async function describeCacheEngineVersions(req, res) {
  const handle = async () => {
    const baseConfig = {
      credentials: res.locals.credentials,
      region: res.locals.provider.backend.region,
    };
    const ec = await getElastiCache(baseConfig);

    const params = {
      Engine: 'redis',
    };

    const fn = () => ec.describeCacheEngineVersions(params).promise();
    return await handleAwsRequest({ fn });
  };
  const extractOutput = async (outputs) => {
    const result = outputs.CacheEngineVersions.map((v) => {
      // terraform only accepts v.x from version 6 onwards
      return v.EngineVersion[0] >= '6' ? v.EngineVersion[0] + '.x' : v.EngineVersion;
    });
    // remove duplicates
    return [...new Set(result)];
  };
  await handleRequest({ req, res, extractOutput, handle });
}

exports.handler = describeCacheEngineVersions;
