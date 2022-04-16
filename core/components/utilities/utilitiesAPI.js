const Application   = require('../../db/models/application');
const constants     = require('../../utils/constants');
const logger        = require('../../utils/logger');
const ObjectId      = require('mongoose').Types.ObjectId;
const Provider      = require('../../db/models/provider');
const queueService  = require('../../queue');
const tokenService  = require('../../utils/auth/tokenService');

const { config } = require('../../utils/config');

const appQueName = config.queueName;
exports.dispatchUtilityJob = async (req, res, next) => {
    try {
        const accountId = res.locals.accountId;
        const userId = res.locals.userId;
        const utilityId = req.query.utilityId;
        logger.info(`dispatchUtilityJob: accountId=${accountId}, utilityId=${utilityId}`);
        const message = {
            jobType: constants.topics.utility,
            jobDetails: {
                accountId,
                details: req.body,
                extras: {
                    utilityId
                }
            }
        };
        logger.verbose(`message: ${JSON.stringify(message, null, 2)}`);
        await queueService.sendMessage(appQueName, message, { userId, accountId , path: constants.jobPaths.utilityMisc });
        res.send('ok');
    } catch (error) {
        logger.error(`error: ${error.message}`);
        res.status(500).send('Failed to schedule the job!');
    }
}