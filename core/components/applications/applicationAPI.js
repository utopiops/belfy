// TODO: DELETE
const Application   = require('../../db/models/application');
const constants     = require('../../utils/constants');
const Job           = require('../../db/models/job');
const logger        = require('../../utils/logger');
const ObjectId      = require('mongoose').Types.ObjectId;
const Provider      = require('../../db/models/provider');
const queueService  = require('../../queue');
const tokenService  = require('../../utils/auth/tokenService');
const { config } = require('../../utils/config');

const appQueName = config.queueName;

// Note: this method is to serve API call from another service. 
// TODO: Create getSummary to be called by portal in the applications dashboard
exports.getAll = async (req, res, next) => {

    try {
        const accountId = tokenService.getAccountIdFromToken(req); 
        const application = await Application.findOne({ accountId: new ObjectId(accountId) }).exec();
        console.log(`application for ${accountId}: ${JSON.stringify(application)}`);
        res.send({
            data: application
        })
    } catch (error) {
        console.log(error.message || error.body || error._body); // TODO: log this
        res.status(500).send('Fetching applications failed');
    }
}

exports.getEnvironmentsProvider = async (req, res, next) => {
    try {
        const accountId = tokenService.getAccountIdFromToken(req);
        console.log(`accountId: ${JSON.stringify(accountId)}`);
        const environmentsSummary = await new Application().getEnvironmentsProvider(accountId);
        res.send(environmentsSummary);
    } catch (error) {
        console.log(error.message || error.body || error._body); // TODO: log this
        res.status(500).send('Fetching environments summary failed');
    }
}

exports.getEnvironmentsBasicSettings = async (req, res, next) => {
    try {
        const accountId = tokenService.getAccountIdFromToken(req);
        console.log(`accountId: ${JSON.stringify(accountId)}`);
        const data = await new Application().getEnvironmentsBasicSettings(accountId);
        res.send(data);
    } catch (error) {
        console.log(error.message || error.body || error._body); // TODO: log this
        res.status(500).send('Fetching environments basic settings failed');
    }
}

exports.getEnvironmentsSummary = async (req, res, next) => {
    try {
        const accountId = tokenService.getAccountIdFromToken(req);
        console.log(`accountId: ${JSON.stringify(accountId)}`);
        const result = await Application.getEnvironmentsSummary(accountId);
        if (!result.success) {
            res.sendStatus(constants.statusCodes.ise);
        } else {
            res.send(result.output.summary);
        }
    } catch (error) {
        console.log(error.message || error.body || error._body); // TODO: log this
        res.sendStatus(constants.statusCodes.ise);
    }
}

exports.getEnvironmentVersionsSummary = async (req, res, next) => {
    try {
        const accountId = tokenService.getAccountIdFromToken(req);
        const environmentName = req.params.name;
        console.log(`accountId: ${JSON.stringify(accountId)}`);
        const result = await Application.getEnvironmentVersionsSummary(accountId, environmentName);
        if (!result.success) {
            res.sendStatus(constants.statusCodes.ise);
        } else {
            res.send(result.output.summary);
        }
    } catch (error) {
        console.log(error.message || error.body || error._body); // TODO: log this
        res.sendStatus(constants.statusCodes.ise);
    }
}

exports.getEnvironmentActivationHistory = async (req, res, next) => {
    try {
        const accountId = tokenService.getAccountIdFromToken(req);
        const environmentName = req.params.name;
        console.log(`accountId: ${JSON.stringify(accountId)}`);
        const result = await Application.getEnvironmentActivationHistory(accountId, environmentName);
        if (!result.success) {
            res.sendStatus(constants.statusCodes.ise);
        } else {
            res.send(result.output.activations);
        }
    } catch (error) {
        console.log(error.message || error.body || error._body); // TODO: log this
        res.sendStatus(constants.statusCodes.ise);
    }
}

exports.createEnvironment = async (req, res, next) => {
    const accountId = tokenService.getAccountIdFromToken(req); // TODO: Remove this (it's derived property)
    const userId = tokenService.getUserIdFromToken(req);
    const { provider, name, region, description } = req.body;
    // TODO: Add validation
    try {
        let result = await Application.createEnvironment({provider, name, region, description, accountId, userId});
        if (!result.success) {
            if (result.message == constants.errorMessages.models.duplicate){
                res.sendStatus(constants.statusCodes.duplicate);
                return;
            }
            res.sendStatus(constants.statusCodes.ise);
        } else {
            res.sendStatus(constants.statusCodes.ok);
        }
    } catch (error) {
        console.error(error.message || error.body || error._body);
        res.sendStatus(500);
    }
}

// This controller sends the job DTO to the IW to be parsed.
exports.createApplication = async (req, res, next) => {
    try {
        const accountId = tokenService.getAccountIdFromToken(req);
        const userId = tokenService.getUserIdFromToken(req);
        const message = {
            jobType: constants.topics.handleUserApplication,
            jobPath: constants.jobPaths.createApplication, // `jobPath` is replacing `jobType` as it supports a hierarchy
            jobDetails: {
                accountId,
                userId,
                details: req.body,
                extras: {
                    operation: constants.operations.create
                }
            }
        };
        logger.verbose(`message: ${JSON.stringify(message, null, 2)}`);
        const jobId = await queueService.sendMessage(appQueName, message, { userId, accountId , path: constants.jobPaths.createApplication});
        res.send(jobId);
    } catch (error) {
        console.log(`error: ${error.message}`);
        res.status(500).send('Failed to schedule the job!');
    }
}
// This controller sends the job DTO to the IW to be parsed and update the environment.
exports.addApplication = async (req, res, next) => {
    try {
        // TODO: Handle (in IW) the case if an idiot wants to call this with an environment and/or version that doesn't exist
        const accountId = tokenService.getAccountIdFromToken(req);
        const userId = tokenService.getUserIdFromToken(req);
        const environmentName = req.params.name;
        const version = req.params.version;

        const jobDetails = Object.assign({}, req.body);
        jobDetails.generalDetails.fromVersion = version;
        jobDetails.generalDetails.envName = environmentName;
        const message = {
            jobPath: constants.jobPaths.createApplication,
            jobDetails: {
                accountId,
                userId,
                details: jobDetails,
                extras: {
                    operation: constants.operations.create,
                    // providerDetails
                }
            }
        };
        logger.verbose(`message: ${JSON.stringify(message, null, 2)}`);
        const jobId = await queueService.sendMessage(appQueName, message, { userId, accountId , path: constants.jobPaths.createApplication});
        res.send(jobId);
    } catch (error) {
        console.log(`error: ${error.message}`);
        res.status(500).send('Failed to schedule the job!');
    }
}

// This controller sends the application name to the IW to be deleted from the environment.
exports.deleteApplication = async (req, res, next) => {
   try {
    const accountId = tokenService.getAccountIdFromToken(req);
    const userId = tokenService.getUserIdFromToken(req);
    const envName = req.params.name;
    const version = req.params.version;
    const appName = req.params.appName;
    
    const jobPath = constants.jobPaths.deleteApplication;
    const message = {
        jobPath, // TODO: Dont set the jobpath here and path down there in sendmessage. use one only idiot!
        jobDetails: {
            userId,
            accountId,
            details: {
                envName,
                version,
                appName
            }
        }
    };
    logger.verbose(`message: ${JSON.stringify(message, null, 2)}`);
    const jobId = await queueService.sendMessage(appQueName, message, { userId, accountId , path: jobPath});
    res.send(jobId);
    } catch (error) {
        console.log(`error: ${error.message}`);
        res.sta
    }

}
// This controller sends the job DTO to the IW to be parsed and update the environment.
exports.updateApplication = async (req, res, next) => {
    try {
        // TODO: Handle (in IW) the case if an idiot wants to call this with an environment and/or version that doesn't exist
        const accountId = tokenService.getAccountIdFromToken(req);
        const userId = tokenService.getUserIdFromToken(req);
        const environmentName = req.params.name;
        const version = req.params.version;
        const appName = req.params.appName;
        const jobDetails = Object.assign({}, req.body);

        // Sick person validations (This wouldn't happen through the UI)
        if (appName !== jobDetails.generalDetails.appName) {
            res.sendStatus(constants.statusCodes.badRequest);
            return;
        }
        jobDetails.generalDetails.fromVersion = version;
        jobDetails.generalDetails.envName = environmentName;
        const jobPath = constants.jobPaths.updateApplication;
        const message = {
            jobPath, // TODO: Dont set the jobpath here and path down there in sendmessage. use one only idiot!
            jobDetails: {
                userId,
                accountId,
                details: jobDetails
            }
        };
        logger.verbose(`message: ${JSON.stringify(message, null, 2)}`);
        const jobId = await queueService.sendMessage(appQueName, message, { userId, accountId , path: jobPath});
        res.send(jobId);
    } catch (error) {
        console.log(`error: ${error.message}`);
        res.status(500).send('Failed to schedule the job!');
    }
}


exports.getApplication = async (req, res, next) => {
    const accountId = tokenService.getAccountIdFromToken(req);
    const environmentName = req.params.name;
    const version = req.params.version;
    console.log(`name: ${environmentName}, version: ${version}`);
    try {
        let result = await Application.getApplicationByVersion(accountId, environmentName, version);
        if (!result.success) {
            res.sendStatus(constants.statusCodes.ise);
        } else {
            res.send(result.output.application);
        }
    } catch (error) {
        console.error(error.message || error.body || error._body);
        res.sendStatus(500);
    }
}

exports.getEnvironmentApplication = async (req, res, next) => {
    const accountId = tokenService.getAccountIdFromToken(req);
    const { name, version, appName } = req.params;
    try {
        let result = await Application.getEnvironmentApplication(accountId, name, version, appName);
        if (!result.success) {
            if (result.message == constants.errorMessages.models.elementNotFound){
                res.sendStatus(constants.statusCodes.notFound);
                return;
            }
            res.sendStatus(constants.statusCodes.ise);
        } else {
            res.send(result.output.app);
        }
    } catch (error) {
        console.error(error.message || error.body || error._body);
        res.sendStatus(500);
    }
}

exports.getEnvironmentApplicationsSummary = async (req, res, next) => {
    const accountId = tokenService.getAccountIdFromToken(req);
    const environmentName = req.params.name;
    const version = req.params.version;
    console.log(`name: ${environmentName}, version: ${version}`);
    try {
        let result = await Application.getEnvironmentApplicationsSummary(accountId, environmentName, version);
        if (!result.success) {
            if (result.message == constants.errorMessages.models.elementNotFound){
                res.sendStatus(constants.statusCodes.notFound);
                return;
            }
            res.sendStatus(constants.statusCodes.ise);
        } else {
            res.send(result.output.env);
        }
    } catch (error) {
        console.error(error.message || error.body || error._body);
        res.sendStatus(500);
    }
}
exports.getEnvironmentProvider = async (req, res, next) => {
    const accountId = tokenService.getAccountIdFromToken(req);
    const environmentName = req.params.name;
    const version = req.params.version;
    console.log(`name: ${environmentName}, version: ${version}`);
    try {
        let result = await Application.getEnvironmentProvider(accountId, environmentName, version);
        if (!result.success) {
            if (result.message == constants.errorMessages.models.elementNotFound){
                res.sendStatus(constants.statusCodes.notFound);
                return;
            }
            res.sendStatus(constants.statusCodes.ise);
        } else {
            res.send(result.output.provider);
        }
    } catch (error) {
        console.error(error.message || error.body || error._body);
        res.sendStatus(500);
    }
}
// This controller is used by IW to store the parsed application
exports.saveApplication = async (req, res, next) => {
    const accountId = tokenService.getAccountIdFromToken(req);
    const userId = tokenService.getUserIdFromToken(req);
    // TODO: Map the dto to the model
    // TODO: Make sure version is not provided
    const dto = req.body.application;
    delete dto._id;
    console.log(`body::: ${JSON.stringify(dto)}`);
    let appToSave = {accountId, createdBy: userId};
    appToSave = Object.assign(appToSave, dto);
    
    try {
        let result = await Application.addApplication(appToSave);
        console.log(`result: ${JSON.stringify(result)}`);
        const jobId = req.body.jobId;
        const job = new Job();
        const updateResult = await job.updateJobStatus(accountId, jobId, constants.jobStats.complete);
        if (!result.success || ! updateResult.success) {
            res.sendStatus(constants.statusCodes.ise);
        } else {
            res.send(result.output.version);
        }
    } catch (error) {
        console.error(error.message || error.body || error._body);
        res.sendStatus(500);
    }
}

// This controller sends a message to the IW to dry-run an application
// IW must update the job status directly
exports.dryRun = async (req, res, next) => {
    try {
        const accountId = tokenService.getAccountIdFromToken(req);
        const userId = tokenService.getUserIdFromToken(req);
        const environmentName = req.params.name;
        const version = req.params.version;
        logger.info(`createApplication: accountId=${accountId}, environment=${environmentName}:${version}`);
        // const provider = req.body.generalDetails.provider.toLocaleLowerCase();
        // const providerDetails = (await new Provider().getSummary(accountId, provider))[0];
        const message = {
            jobPath: constants.jobPaths.dryRunApplication, // `jobPath` is replacing `jobType` as it supports a hierarchy
            jobDetails: {
                userId,
                accountId,
                details: {
                    environmentName,
                    version
                }
            }
        };
        logger.verbose(`message: ${JSON.stringify(message, null, 2)}`);
        const jobId = await queueService.sendMessage(appQueName, message, { userId, accountId , path: constants.jobPaths.dryRunApplication});
        res.send(jobId);
    } catch (error) {
        console.log(`error: ${error.message}`);
        res.status(500).send('Failed to schedule the job!');
    }
}

// This controller sends a message to the IW to activate an application
// IW must update the job status directly
exports.activateApplication  = async (req, res, next) => {
    try {
        const accountId = tokenService.getAccountIdFromToken(req);
        const userId = tokenService.getUserIdFromToken(req);
        const environmentName = req.params.name;
        const version = req.params.version;
        logger.info(`activate: accountId=${accountId}, environment=${environmentName}:${version}`);
        const message = {
            jobType: constants.topics.activateApplication,
            jobPath: constants.jobPaths.activateApplication, // `jobPath` is replacing `jobType` as it supports a hierarchy
            jobDetails: {
                userId,
                accountId,
                details: {
                    environmentName,
                    version
                }
            }
        };
        let updateResult = await Application.updateActivation(accountId, environmentName, version, Date.now(), userId);

        if (!updateResult.success || ! updateResult.success) {
            res.sendStatus(constants.statusCodes.ise);
        } else {
            const jobId = await queueService.sendMessage(appQueName, message, { userId, accountId , path: constants.jobPaths.activateApplication});
            res.send(jobId);
        }
    } catch (error) {
        logger.error(`error: ${error.message || error.body}`)
        res.sendStatus(constants.statusCodes.ise);
    }
}


exports.getEnvironmentRegion = async (req, res, next) => {
    try {
        const accountId = tokenService.getAccountIdFromToken(req);
        const environmentName = req.params.name;
        const result = await Application.getEnvironmentRegion(accountId, environmentName);
        console.log(`result: ${JSON.stringify(result)}`);
        if (!result.success) {
            if (result.message == constants.errorMessages.models.elementNotFound){
                res.sendStatus(constants.statusCodes.notFound);
                return;
            }
            res.sendStatus(constants.statusCodes.ise);
        } else {
            res.send(result.output.region);
        }
    } catch (error) {
        console.error(error.message || error.body || error._body);
        res.sendStatus(500);
    }
}