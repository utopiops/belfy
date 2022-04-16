const router = require('express').Router();

const { getProviderWithCredentialsV2 } = require('../../../../middlewares/getProviderV2');

const { handler: describeCacheEngineVersions } = require('./describeCacheEngineVersions');

const { handler: listCacheNodeTypes } = require('./listCacheNodeTypes');

router.get(
  '/describeCacheEngineVersions/:environmentName',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  describeCacheEngineVersions,
);

router.post(
  '/listCacheNodeTypes/:environmentName',
  getProviderWithCredentialsV2({ routeParam: 'environmentName' }),
  listCacheNodeTypes,
);

module.exports = router;
