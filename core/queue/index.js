const amqp = require('amqplib');
const config = require('../utils/config').config;
const Job = require('../db/models/job');
const constants = require('../utils/constants');
const { defaultLogger: logger } = require('../logger');

// TODO: Make sure all the consumers of this method, provide jobOptions as the jobs are supported now
// TODO: Don't repeat data like accountId, userId and path in both the message and the jobOptions parameters
/*  sendMessage hides the implementation details on how the services communicate through a queue, which can be RabbitMQ, 
		SQS, etc under the hood and the caller just provides the job details and queueName.
		Also, the abstraction is achieved through a hierarchical structure, i.e. along a chain of function calls the callers hide more details each time.
		This service is very low level and it shouldn't be used by controllers directly, but other services can use it and provide queueName accordingly.
*/
const sendMessage = async (queueName, message, jobOptions = {}) => {
	console.log(`sending message to ${config.amqpUrl}`);
	const job = new Job();
	const result = await job.addJob({
		userId: jobOptions.userId,
		accountId: jobOptions.accountId,
		path: jobOptions.path,
		...(jobOptions.jobDataBag ? { dataBag: jobOptions.jobDataBag } : {}), // TODO: dataBag and deadline should be set from now onw and this shouldn't be optional after it's done for existing code
		...(jobOptions.deadline ? { deadline: jobOptions.deadline } : {})
	});
	if (!result.success) {
		throw new Error('failed to schedule the job');
	}
	const jobId = result.output.jobId;
	message.jobDetails.jobId = jobId;

	try {
		var open = await amqp.connect(config.amqpUrl);
		var channel = await open.createConfirmChannel();
		await channel.assertQueue(queueName, { durable: true });
		const sent = await channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), {
			persistent: true,
			// expiration: jobOptions.expiration,
			timestamp: Date.now(),
			mandatory: true,
		});
		// Note: I don't check the value of sent as I think it's enough to just rely on waitForConfirms, might be wrong though!
		await channel.waitForConfirms();
		return jobId
	} catch (error) {
		logger.error(error)
		job.updateJobStatus(jobOptions.accountId, jobId, constants.jobStatus.failed); //TODO: include the reason as a message
		throw new Error('failed to schedule the job');
	}
};

module.exports.sendMessage = sendMessage;
