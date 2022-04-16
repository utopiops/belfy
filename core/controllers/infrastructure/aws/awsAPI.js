var {
    catchError
} = require('rxjs/operators');
var {
    Rx,
    of ,
    forkJoin
} = require('rxjs');
const AWS = require('aws-sdk');

const tokenService = require('../../../utils/auth/tokenService');
const User = require('../../../db/models/user');

const configHandler = require('../../../utils/config');
const config = new configHandler();

const CREDENTIALS_ERROR = 'InvalidSignatureException';

exports.getSummary = async (req, res, next) => {

    const userId = tokenService.getUserIdFromToken(req);
    const baseConfig = await config.getAwsBaseConfig(userId);

    if (!baseConfig ||
        !baseConfig.region ||
        !baseConfig.credentials.accessKeyId ||
        !baseConfig.credentials.secretAccessKey) { // This indicates that the credentials are not set
        res.status(404).send();
        return;
    }

    const result = {};
    const region = req.query.region; // This can override the default region
    baseConfig.region = !!req.query.region ? req.query.region : baseConfig.region;

    const ec2 = getEc2(baseConfig);
    const ec2Promise = ec2.describeInstances({}).promise();
    const vpcPromise = ec2.describeVpcs({}).promise();

    const elb = getElbV2(baseConfig);
    const elbPromise = elb.describeLoadBalancers({}).promise();

    const ecs = getEcs(baseConfig);
    const ecsPromise = ecs.listClusters({}).promise();

    const rds = getRds(baseConfig);
    const rdsPromise = rds.describeDBInstances({}).promise();

    const s3 = getS3(baseConfig);
    const s3Promise = s3.listBuckets({}).promise();

    const lambda = getLambda(baseConfig);
    const lambdaPromise = lambda.listFunctions({}).promise();

    const apiGateway = getapiGateway(baseConfig);
    const apiGatewayPromise = apiGateway.getRestApis({}).promise();


    forkJoin(ec2Promise, vpcPromise, elbPromise, ecsPromise, rdsPromise, s3Promise, lambdaPromise, apiGatewayPromise)
        .subscribe(values => {
            var i = 0;
            result.ec2s = values[i++];
            result.vpcs = values[i++];
            result.elbs = values[i++];
            result.clusters = values[i++];
            result.rdses = values[i++];
            result.buckets = values[i++];
            result.lambdas = values[i++];
            result.restApis = values[i++];
            res.send(result);
        }, error => {
            console.log(`error: ${JSON.stringify(error.code)}`);
            if (error.code === CREDENTIALS_ERROR) {
                res.status(401).send();
            } else {
                res.status(500).send();
            }
        });

}

exports.getAllEc2 = async (req, res, next) => {

    const userId = tokenService.getUserIdFromToken(req);
    const baseConfig = await config.getAwsBaseConfig(userId);

    if (!baseConfig ||
        !baseConfig.region ||
        !baseConfig.credentials.accessKeyId ||
        !baseConfig.credentials.secretAccessKey) { // This indicates that the credentials are not set
        res.status(404).send();
        return;
    }
    baseConfig.region = !!req.query.region ? req.query.region : baseConfig.region;

    const ec2 = getEc2(baseConfig);
    var params = {
        DryRun: false,
        Query: [{
            Reservations: []
        }]
    };
    const ec2Promise = ec2.describeInstances({}).promise()
        .then(values => {
            res.send(values);
        }, error => {
            console.log(`error: ${JSON.stringify(error.code)}`);
            if (error.code === CREDENTIALS_ERROR) {
                res.status(401).send();
            } else {
                res.status(500).send();
            }
        });
}

exports.setCredentials = async (req, res, next) => {
    const userId = tokenService.getUserIdFromToken(req);
    var user = new User();
    await user.setAwsCredentials(userId, req.body,
        res.send('ok'));
}

exports.setPreferences = async (req, res, next) => {
    const userId = tokenService.getUserIdFromToken(req);
    var user = new User();
    await user.setAwsPreferences(userId, req.body,
        res.send('ok'));
}

// Private functions
function getIam(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.IAM({
        apiVersion: '2010-05-08'
    });
}

function getEcs(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.ECS({
        apiVersion: '2014-11-13'
    });
}

function getEc2(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.EC2({
        apiVersion: '2016-11-15'
    });
}

function getElbV2(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.ELBv2({
        apiVersion: '2016-11-15'
    });
}

function getRds(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.RDS({
        apiVersion: '2016-11-15'
    });
}

function getS3(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.S3({
        apiVersion: '2016-11-15'
    });
}

function getLambda(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.Lambda({
        apiVersion: '2016-11-15'
    });
}

function getapiGateway(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.APIGateway({
        apiVersion: '2016-11-15'
    });
}

function updateConfig(baseConfig) {
    AWS.config.update({
        region: baseConfig.region,
        accessKeyId: baseConfig.credentials.accessKeyId,
        secretAccessKey: baseConfig.credentials.secretAccessKey
    });
}