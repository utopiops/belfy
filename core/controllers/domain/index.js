const express = require('express');
const router = express.Router();
const { access } = require('../../middlewares/planManager');

const { handler: addDomain } = require('./addDomain');
const { handler: listDomains } = require('./listDomains');
const { handler: deleteDomain } = require('./deleteDomain');
const { handler: deployDomain } = require('./deployDomain');
const { handler: destroyDomain } = require('./destroyDomain');
const { handler: setDomainState } = require('./setDomainState');
const { handler: getDomainResources } = require('./getDomainResources');

// TODO: Add `list` and `getDetails` endpoints

// add a domain
router.post(
  '/',
  access({ resource: 'domain', action: 'create' }),
  addDomain
);

// list domains
router.get('/', listDomains);

// Delete a domain
router.delete('/name/:domainName', deleteDomain);

// Deploy a domain
router.post('/name/:domainName/deploy', deployDomain);

// Destroy a domain
router.post('/name/:domainName/destroy', destroyDomain);

// Set a domain's state
router.post('/accountId/:accountId/name/:domainName/state', setDomainState);

// Get the actual resources of the domain deployed on the Cloud
router.get('/name/:domainName/resources', getDomainResources);

module.exports = router;
