const AWS = require('aws-sdk');
const awsApiVersions = require('../../../../utils/awsApiVersions');
const constants = require('../../../../utils/constants');
const tokenService = require('../../../../utils/auth/tokenService');

const yup = require('yup');
const { getEnvironmentProviderCredentials } = require('../helpers');

exports.listServiceTasks = listServiceTasks;
exports.stopTask = stopTask;


async function listServiceTasks(req, res) {

    const accountId = tokenService.getAccountIdFromToken(req);
    const validationSchema = yup.object().shape({
        environmentName: yup.string()
            .required(),
        cluster: yup.string()
            .required(),
        serviceName: yup.string()
            .required(),
    });
    try {
        validationSchema.validateSync(req.body);
    } catch (err) {
        res.status(constants.statusCodes.ue).send(err.message);
        return;
    }

    const { environmentName, cluster, serviceName } = req.body;
    const { credentials, region } = await getEnvironmentProviderCredentials(accountId, environmentName, res)
    if (!credentials) { // This means an error occurred and the response has already been sent
        return;
    }

    const baseConfig = {
        credentials,
        region
    }
    const ecs = getEcs(baseConfig);
    try {
        const resp = await ecs.listTasks({ cluster, serviceName }).promise();
        const  taskArns = resp.taskArns;
        if (!taskArns || !taskArns.length) {
            res.status(constants.statusCodes.ok).send([]);
        } else {
            // each task arn is something like this "arn:aws:ecs:us-east-1:994147050565:task/a3ebbf3f-c2c8-461b-a8de-c2ae455a/2ad2cabe91d94e76856c7b207c3fb590"
            // we should extract the last part of the ARN to get the task IDs
            const tasks = taskArns.map(t => t.split(":task/")[1]);
            const taskDetails = await ecs.describeTasks( { cluster, tasks }).promise();
            res.send(taskDetails);
        }
    } catch (err) {
        console.log(`error: ${err.message} - ${err.code}`);
        var status = constants.statusCodes.ise;
        res.status(status).send();
    }
}

async function stopTask(req, res) {

    const accountId = tokenService.getAccountIdFromToken(req);
    const validationSchema = yup.object().shape({
        environmentName: yup.string()
            .required(),
        cluster: yup.string()
            .required(),
        task: yup.string()
            .required(),
    });
    try {
        validationSchema.validateSync(req.body);
    } catch (err) {
        res.status(constants.statusCodes.ue).send(err.message);
        return;
    }

    const { environmentName, cluster, task } = req.body;
    const { credentials, region } = await getEnvironmentProviderCredentials(accountId, environmentName, res)
    if (!credentials) { // This means an error occurred and the response has already been sent
        return;
    }

    const baseConfig = {
        credentials,
        region
    }
    const ecs = getEcs(baseConfig);
    try {
        await ecs.stopTask({ cluster, task }).promise();
        res.sendStatus(constants.statusCodes.ok);
    } catch (err) {
        console.log(`error: ${err.message} - ${err.code}`);
        if (err.code === "InvalidParameterException") {
            res.status(constants.statusCodes.badRequest).send({ message: err.message});
        } else {
            res.sendStatus(constants.statusCodes.ise);
        }
    }
}

// Private functions
function getEcs(baseConfig) {
    updateConfig(baseConfig);
    return new AWS.ECS({
        apiVersion: awsApiVersions.ecs
    });
}


function updateConfig(baseConfig) {
    AWS.config.update({
        region: baseConfig.region,
        accessKeyId: baseConfig.credentials.accessKeyId,
        secretAccessKey: baseConfig.credentials.secretAccessKey
    });
}