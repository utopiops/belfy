const QueueService = require('../../../../queue');
const tokenService = require('../../../../utils/auth/tokenService');
const { config } = require('../../../../utils/config');

const appQueName = config.queueName;


exports.create = async (req, res, next) => {

    const userId = tokenService.getUserIdFromToken(req);

    // send a message with the topic ....
    const message = {
        jobType: 'create_k8s_mongodb',
        jobDetails: {
            userId,
            details: req.body,
        }
    }
    await QueueService.sendMessage(appQueName, message);
    res.send('ok');
}