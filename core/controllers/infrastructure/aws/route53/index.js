var express = require('express');
var router = express.Router();
const { getProviderWithCredentialsV4 } = require('../../../../middlewares/getProviderV4');


const {handler: listHostedZonesByName} = require('./listHostedZonesByName');

router.get('/environment/name/:environmentName/listHostedZonesByName',  getProviderWithCredentialsV4({ routeParam: "environmentName" }),  listHostedZonesByName);

module.exports = router;