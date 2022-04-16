const tokenService  = require('../../../../utils/auth/tokenService');
const awsSdkService = require('../shared/awsSdk');
const jmespath      = require('jmespath');
jmespath.search({foo: {bar: {baz: [0, 1, 2, 3, 4]}}}, "foo.bar.baz[2]")

const identifier = 'route53';

exports.listHostedZonesByName = async (req, res, next) => {

    const query = req.query.query;
    const handleError = statusCode => res.status(statusCode || 500).send();
    const handleData = data => res.send(search(data, query));
    const accountId = tokenService.getAccountIdFromToken(req);
    
    await awsSdkService.callAwsSdk(accountId, identifier, 'listHostedZonesByName', handleError, handleData, params = {});
}

const search = (data, query) => query ? jmespath.search(data, query) : data;