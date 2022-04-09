const config = require('../../../config');
const constants = require('../../../shared/constants');
const fileHelper = require('../file-helper');
const http = require('../../../shared/http.service');
const AuthTokenHelper = require('../../../shared/authToken.helper');
const JobLogstreamService = require('../../../services/job-logstream');
const spawn = require('child_process').spawn;
const logger = require('../../../shared/logger');
const AWS = require('aws-sdk');


exports.initializeMainTerraformAws = async (params, path, withoutBackend = false) => {

    // Get the provider details
    try {
        if (params.withoutProvider) { // This is for terraform module state
            await fileHelper.createFile('utopiops_water_remote_state.tf', path);
        } else {
            await fileHelper.createFile('main.tf', path);
        }
        await fileHelper.createFile('outputs.tf', path);

        var content = params.withoutProvider ? '' :
            `provider "aws" {
    // version = "3.63.0"
    region="${params.providerRegion ? params.providerRegion : params.region}"
}
`;
        if (!withoutBackend) {
            content += `
terraform {
    backend "s3"{
        encrypt = true
        bucket  = "${params.bucketName}"
        key     = "utopiops-water/${params.stateKey}"
        region  = "${params.region}"
        kms_key_id = "${params.kmsKeyId}"
        dynamodb_table = "${params.dynamodbName}"
    }
}
`;

            /* 
            TODO: provide the backend config like this and get rid of this function altogether. IMPORTANT: to replace this, it's not enough to just pass the backend config as flags in the commands
            and the provider should be added in file named main.tf; also seems the file outputs.tf is redundant
            */
            // $ terraform init \
            //     -backend-config="address=demo.consul.io" \
            //     -backend-config="path=example_app/terraform_state" \
            //     -backend-config="scheme=https"
        }
        if (params.withoutProvider) { // This is for terraform module state
            await fileHelper.writeToFile(`${path}/utopiops_water_remote_state.tf`, content);
        } else {
            await fileHelper.writeToFile(`${path}/main.tf`, content);
        }
    } catch (error) {
        logger.error(error);
        // TODO: Handle the error
    }
}


exports.execute = async (path, command, params) => {
    var {
        stdout
    } = await spawn(command, params, {
        cwd: path
    });
    return stdout;
}

exports.getCredentials = getCredentials;
async function getCredentials(options) {
    var credentials = {};
    if (options.credentials) {
        credentials.AWS_ACCESS_KEY_ID = options.credentials.accessKeyId; // AWS only
        credentials.AWS_SECRET_ACCESS_KEY = options.credentials.secretAccessKey; // AWS only
        credentials.ARM_SUBSCRIPTION_ID = options.credentials.subscription; // Azure only
        credentials.ARM_CLIENT_ID = options.credentials.appId; // Azure only
        credentials.ARM_TENANT_ID = options.credentials.tenant; // Azure only
        credentials.ARM_CLIENT_SECRET = options.credentials.password; // Azure only
        credentials.DIGITALOCEAN_TOKEN = options.credentials.digitalOceanToken; // Digital ocean only
        credentials.SPACES_ACCESS_KEY_ID = options.credentials.spacesAccessKeyId; // Digital ocean only
        credentials.SPACES_SECRET_ACCESS_KEY = options.credentials.spacesSecretAccessKey; // Digital ocean only
        credentials.GOOGLE_APPLICATION_CREDENTIALS = './serviceAccountKey.json'; // Gcp only (it's path to serviceAccountKey.json file that includes gcp provider credentials)

        if (options.credentials.serviceAccountKey) { // Gcp credentials must be in a json file
            await fileHelper.writeToFile(`${options.rootFolderPath}/serviceAccountKey.json`, options.credentials.serviceAccountKey)
        }
    }
    return credentials;
}

exports.runTerraform = async (rootFolderPath, options = {}) => {

    options.rootFolderPath = rootFolderPath // this is for gcp credentials
    var credentials = await getCredentials(options)

    let command = [];
    switch (options.action) {
        case 'plan':
            command = ['plan', '-lock=false', '-no-color'];
            break;
        case 'apply':
            command = ['apply', '-auto-approve', '-lock=true', '-lock-timeout=60s', '-no-color', ...(options.target ? [`-target=${options.target}`] : [])];
            break;
        case 'destroy':
            command = ['destroy', '-auto-approve', '-lock=true', '-lock-timeout=60s', '-no-color', ...(options.target ? [`-target=${options.target}`] : [])];
            break;
        default:
            command = options.plan ? ['plan'] : ['apply', '-auto-approve']; // this is for backward compatibility. TODO: delete as soon as possible
    }





    var env = Object.create(process.env);
    for (let key in credentials) { // Set all the tfVars in the options as TF_VAR_ environment variables
        env[key] = credentials[key];
    }
    for (let key in options.tfVars) { // Set all the tfVars in the options as TF_VAR_ environment variables
        env[`TF_VAR_${key}`] = options.tfVars[key];
    }
    // env.TF_LOG = 'DEBUG'
    var terraformInitParams = ['init'];
    if (options.withBackend) {
        terraformInitParams.push('-backend=true'); // Set backend configs in options.backen based on provider type
        if (options.backend) { // todo: remove this if block when backend added to aws resources
            Object.keys(options.backend).forEach(key => {
                terraformInitParams.push(`-backend-config="${key}=${options.backend[key]}"`)
            });
        }
    }

    // This is not nice but without this, the plan will fail!
    await new Promise(resolve => setTimeout(resolve, 5000));

    await childExecute('terraform', terraformInitParams, {
        cwd: rootFolderPath,
        env: env,
        detached: true,
        shell: true
    }, options.jobId, { id: options.id, accountId: options.accountId });

    if (options.action === 'destroy') {
        env.TF_WARN_OUTPUT_ERRORS = 1;
    }

    if (options.unlock && options.unlock.enabled && (options.action == 'apply' || options.action == 'destroy')) {
        // if state is locked, unlock it first! ATM the only way to run the Terraform code for managed resources is through core and if core is giving permission to apply/destroy we unlock the state

        const dynamodb = getDynamodb({ region: options.unlock.region, accessKeyId: credentials.AWS_ACCESS_KEY_ID, secretAccessKey: credentials.AWS_SECRET_ACCESS_KEY })
        const getItemParams = {
            Key: {
                "LockID": {
                    S: `${options.unlock.bucketName}/${options.unlock.stateKey}`
                },
            },
            TableName: options.unlock.dynamodbName
        };
        const lock = await dynamodb.getItem(getItemParams).promise();
        logger.verbose(`getItemParams: ${JSON.stringify(getItemParams)}`);
        logger.verbose(`lock: ${JSON.stringify(lock)}`);
        if (Object.keys(lock).length) {
            logger.verbose('state is locked! unlocking the state...')
            const terraformUnlockParams = ['force-unlock', '-force', JSON.parse(lock.Item.Info.S).ID]
            await childExecute('terraform', terraformUnlockParams, {
                cwd: rootFolderPath,
                env: env,
                detached: true,
                shell: true
            }, options.jobId, { id: options.id, accountId: options.accountId });
            logger.verbose('state is unlocked.')
        }
    }

    await childExecute('terraform', command, {
        cwd: rootFolderPath,
        env: env,
        detached: true,
        shell: true
    }, options.jobId, { id: options.id, accountId: options.accountId }, true);
}

exports.getSingleTerraformOutputV2 = async (rootFolderPath, options, outputName) => {
    var credentials = await getCredentials(options)
    var env = Object.create(process.env);
    for (let key in credentials) { // Set all the tfVars in the options as TF_VAR_ environment variables
        env[key] = credentials[key];
    }
    for (let key in options.tfVars) { // Set all the tfVars in the options as TF_VAR_ environment variables
        env[`TF_VAR_${key}`] = options.tfVars[key];
    }
    env.NO_COLOR = 1
    const refreshChild = spawn('terraform', ['refresh'], {
        cwd: rootFolderPath,
        env: env,
        detached: true,
        stdio: 'inherit'
    });
    var exitCode = await new Promise((resolve, reject) => {
        refreshChild.on('close', async code => !code ? resolve(code) : reject(code));
    });
    logger.info(`refresh done`);
    const outputChild = spawn('terraform', ['output', '--raw', outputName], {
        cwd: rootFolderPath,
        detached: true

    });
    var stdout = '';
    outputChild.stdout.on('data', (data) => {
        stdout += data;
        logger.info(data.toString());
    });
    exitCode = await new Promise((resolve, reject) => {
        outputChild.on('close', async code => !code ? resolve(code) : reject(code));
    });
    // TODO: Add if (exitCode) { // throw error }
    logger.info(`output generated: ${stdout}`);
    return stdout && stdout.trim();
}

// it will be depricated
exports.getSingleTerraformOutput = async (rootFolderPath, options, outputName) => {
    var credentials = {};
    var providerDetails = await http.get(`${config.apiUrl}/account/config/provider/credentials?accountId=${options.accountId}&displayName=${options.displayName}`);
    credentials.AWS_ACCESS_KEY_ID = `${providerDetails.data.accessKeyId}`
    credentials.AWS_SECRET_ACCESS_KEY = `${providerDetails.data.secretAccessKey}`
    var env = Object.create(process.env);
    env.AWS_ACCESS_KEY_ID = credentials.AWS_ACCESS_KEY_ID;
    env.AWS_SECRET_ACCESS_KEY = credentials.AWS_SECRET_ACCESS_KEY;
    env.NO_COLOR = 1
    const refreshChild = spawn('terraform', ['refresh'], {
        cwd: rootFolderPath,
        env: env,
        detached: true,
        stdio: 'inherit'
    });
    var exitCode = await new Promise((resolve, reject) => {
        refreshChild.on('close', async code => !code ? resolve(code) : reject(code));
    });
    logger.info(`refresh done`);
    const outputChild = spawn('terraform', ['output', outputName], {
        cwd: rootFolderPath,
        detached: true

    });
    var stdout = '';
    outputChild.stdout.on('data', (data) => {
        stdout += data;
        logger.info(data.toString());
    });
    exitCode = await new Promise((resolve, reject) => {
        outputChild.on('close', async code => !code ? resolve(code) : reject(code));
    });
    // TODO: Add if (exitCode) { // throw error }
    logger.info(`output generated: ${stdout}`);
    return stdout && stdout.trim();
}
exports.getTerraformOutput = async (rootFolderPath, options) => {
    var credentials = {};
    var providerDetails = await http.get(`${config.apiUrl}/account/config/provider/credentials?accountId=${options.accountId}&displayName=${options.displayName}`);
    credentials.AWS_ACCESS_KEY_ID = `${providerDetails.data.accessKeyId}`
    credentials.AWS_SECRET_ACCESS_KEY = `${providerDetails.data.secretAccessKey}`


    var env = Object.create(process.env);
    env.AWS_ACCESS_KEY_ID = credentials.AWS_ACCESS_KEY_ID;
    env.AWS_SECRET_ACCESS_KEY = credentials.AWS_SECRET_ACCESS_KEY;
    const outputChild = spawn('terraform', ['output'], {
        cwd: rootFolderPath,
        env: env,
        detached: true
    });
    var stdout = '';
    outputChild.stdout.on('data', (data) => {
        stdout += data;
        logger.info(data.toString());
    });
    var exitCode = await new Promise((resolve, reject) => {
        outputChild.on('close', async code => !code ? resolve(code) : reject(code));
    });
    // TODO: Add if (exitCode) { // throw error }
    logger.info(`output(s) generated: ${stdout}`);

    return parseOutputs(stdout);
}

function parseOutputs(text) {
    const lines = text.split("\n");
    var outputs = {};
    lines.map(line => {
        const lSplit = line.split("=");
        if (lSplit.length > 1) { // This is to handle the empty strings created as the result of the first split
            outputs[lSplit[0].trim()] = lSplit[1].trim();
        }
    });
    return outputs;
}

// This function executes command as a child process and sends the logs to the logstream-manager
exports.childExecute = childExecute;
async function childExecute(command, args, options, jobId, user, lastLineOnClose = false) {
    const jobLogstreamService = new JobLogstreamService();
    const child = spawn(command, args, options);
    child.stdout.setEncoding('utf8');
    var lineNumber = 0;
    child.stdout.on('data', async function (data) {
        const log = {
            jobId: jobId,
            lineNumber: ++lineNumber, //possible race condition?
            payload: data.toString(),
            isLastLine: false
        }
        await jobLogstreamService.sendLog(user, log, jobId);
        logger.info(data.toString());
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', async function (data) {
        const log = {
            jobId: jobId,
            lineNumber: ++lineNumber, //possible race condition?
            payload: data.toString(),
            isLastLine: false
        }
        await jobLogstreamService.sendLog(user, log, jobId);
        logger.error(data.toString());
    });
    return new Promise((resolve, reject) => {
        child.on('close', async code => {
            if (lastLineOnClose) {
                const log = {
                    jobId: jobId,
                    lineNumber: ++lineNumber,
                    payload: ".",
                    isLastLine: true
                }
                await jobLogstreamService.sendLog(user, log, jobId);
            }
            logger.info(`executing ${command} ${JSON.stringify(args)} finished with exit code ${code}`);
            !code ? resolve(code) : reject(code);
        });
    });
}


const getDynamodb = ({ region, accessKeyId, secretAccessKey }) => {
    AWS.config.update({
        region,
        ...(accessKeyId ? {
          accessKeyId,
          secretAccessKey
        } : {})
    });
    return new AWS.DynamoDB({
        apiVersion: '2012-08-10'
    });
}
