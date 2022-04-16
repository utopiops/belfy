const router = require('express').Router();
const azure = require('./azure');
const digitalOcean = require('./digitalOcean');
const gcp = require('./gcp');
const { access } = require('../../middlewares/planManager');

const { handler: getProviderDetails } = require('./getProviderDetails');
const { handler: getProviderStatus } = require('./getProviderStatus');
const { handler: getEnabledProviders } = require('./getEnabledProviders');
const { handler: testProvider } = require('./testProvider');
const { handler: updateCredentials } = require('./updateCredentials');
const { handler: deployProvider } = require('./deployProvider');
const { handler: addAwsProvider } = require('./addAwsProvider');
const { handler: deleteProvider } = require('./deleteProvider');
const { handler: deleteProviderAfterJobDone } = require('./deleteProviderAfterJobDone');
const { handler: updateProviderStatus } = require('./updateProviderStatus');
const { handler: listProviderSummaries } = require('./listProviderSummaries');
const { handler: getProviderCredentials } = require('./getProviderCredentials');


router.use("/azure", azure);
router.use("/digitalOcean", digitalOcean);
router.use("/gcp", gcp);


/*
description: Get the provider details
example:
  request: 
    GET: /v3/provider/displayName/aws-dev
  output: 
{
    "status": "ready",
    "name": "aws",
    "region": "us-east-1",
    "bucketName": "0c44bb81-a94c-49ea-9b9a-ac926a8067ac",
    "dynamodbName": "aa278e0e-a080-450f-afdd-1e168329d269",
    "kmsKeyId": "d09ea5fa-a320-4a01-a78c-2dec7cbb125c"
}
*/
router.get('/displayName/:displayName', getProviderDetails);

router.get('/displayName/:displayName/credentials', getProviderCredentials);

/*
description: Get the provider details
example:
  request: 
    GET: /v3/provider/displayName/example/status
  output: 
    created
*/
router.get('/displayName/:displayName/status', getProviderStatus);

/*
description: Get the provider details
example:
  request: 
    GET: /v3/provider/enabled
  output: 
    [
      "aws",
      "azure"
    ]
*/
router.get('/enabled', getEnabledProviders);

/*
description:  Tests if the provider credentials are valid credentials or not. // TODO: Make it a proper test and check if the cloud provider has changed
example:
  request: 
    POST: 
      url: /v3/provider/displayName/aws-dev/test
      body: 
        {
          "accessKeyId":"aaaaa",
          "secretAccessKey":"bbbbb"
        }
*/
router.post('/displayName/:displayName/test', testProvider);

/*
description: Updates the credentials of a provider

*/

router.patch('/displayName/:displayName/credentials', updateCredentials);

/*
description: Deploys a provider
*/
router.post('/displayName/:displayName/deploy', deployProvider);

/*
NOTE: REPLACES post /account/config/provider/aws
description: Adds an AWS provider
*/
router.post(
  '/aws',
  access({ resource: 'provider', action: 'create' }),
  addAwsProvider
);

/*
NOTE: REPLACES delete /account/config/provider/name/:name
description: Deletes a provider if it's not used, otherwise destroys it which will be followed by a delete triggered from infw
*/
router.delete('/displayName/:displayName', deleteProvider);

/*
NOTE: REPLACES 
description: 
*/
// following route should only be used from infrastructure-worker
router.post('/displayName/:displayName/destroyed', deleteProviderAfterJobDone);

/*
NOTE: REPLACES delete /account/config/provider/name/:name
description: 
*/
router.patch('/:kind/displayName/:displayName/status', updateProviderStatus);

/*
NOTE: REPLACES get /account/config/provider
description: 
*/
router.get(['/',
  '/name/:name'
], listProviderSummaries);

module.exports = router;
