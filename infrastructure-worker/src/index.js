'use strict';

/*
NOTE: This implementation still needs the following improvements
1. rate limiting / worker pool
2. stop accepting new messages if core is down and/or cannot update the status of the jobs (adjustable back off mechanism)

^ number 2 is critical
*/

require('dotenv').config();
const dispatcher = require('./dispatcher/index');
const config = require('./config');
const amqp = require('amqplib');
const AuthTokenHelper = require('./shared/authToken.helper');
const logger = require('./shared/logger');
require('newrelic');

let userHelper = require('./shared/user.helper');
dispatcher.loadJobhandlers();

process.on('uncaughtException', function (error) {
  logger.error(error)
});
const Sentry = require('@sentry/node');
const JobService = require('./services/job');
let jobService = new JobService();

Sentry.init({
  dsn: config.sentryDsn,
  debug: true,
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true })
  ],

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

let queueConnectionIsHealthy = true;

(async () => {

  logger.info(`${config.appName} started...`);


  await startHealthCheckServer();

  // Register the app in STS, this operation is idempotent
  try {
    logger.verbose(`Registering the application`);
    await AuthTokenHelper.register();
    logger.verbose(`Registered the application with the api.`);
  } catch (e) {
    logger.error(e);
    Sentry.captureException(e);
    process.exit(1);
  }

  // Wait for the messages and dispatch them
  logger.info(`trying to connect to rabbit mq on %s ...`, config.amqpUrl);

  const conn = await amqp.connect(`${config.amqpUrl}?heartbeat=10s`);
  conn.on('error', error => {
    logger.error(error, '[RabbitMQ] Connection error occurred')
    queueConnectionIsHealthy = false;
  });

  const ch = await conn.createChannel();
  ch.assertQueue(config.queueName, { durable: true });
  ch.on('error', error => {
    // Should we do something about this?
    queueConnectionIsHealthy = false;
    logger.error(error, '[RabbitMQ] Channel error occurred')
  });
  
  ch.prefetch(Number(config.jobRate)); // The number of messages that infw handles at a time 

  logger.verbose(`[RabbitMQ] Waiting for messages...`);
  await ch.consume(config.queueName, async msg => {
    if (!msg.content) { // should I even check this?
      return;
      // Log this incident
    }
    logger.verbose("[RabbitMQ] Received %s", msg.content.toString());
    const { jobType, jobDetails, jobPath } = JSON.parse(msg.content.toString());
    const user = userHelper.getUserFromJobDetails(jobDetails);
    // console.log(`properties`, msg.properties)
    // console.log(`fields`, msg.fields)
    try {
      await dispatcher.dispatchJob(jobType, jobDetails, jobPath);
      logger.verbose(`job with jobId ${jobDetails.jobId} completed successfully`)
      ch.ack(msg);
      logger.verbose(`[RabbitMQ] ack for ${jobDetails.jobId}`);
    }
    catch (error) {
      logger.verbose(`error occurred handling the job: ${jobDetails.jobId}`);
      logger.error(error)

      if (error.message === "cannot process the job") {
        const success = await jobService.notifyJobTimeout(user, jobDetails.jobId);
        if (success) {
          logger.verbose(`job with jobId ${jobDetails.jobId} timed out`)
          ch.reject(msg, false); //Do not requeue, notify timeout
          logger.verbose(`[RabbitMQ] reject without for ${jobDetails.jobId}`);
          return;
        }
        ch.reject(msg, true); // Let the next worker notify it's timed out
        logger.verbose(`[RabbitMQ] reject with requeue for ${jobDetails.jobId}`);
        return;
      }
      const success = await jobService.notifyJobFailed(user, jobDetails.jobId);
      if (success) {
        logger.verbose(`job with jobId ${jobDetails.jobId} failed`)
        ch.reject(msg, false); //Do not requeue, notify failure
        logger.verbose(`[RabbitMQ] reject without for ${jobDetails.jobId}`);
        return;
      }
      ch.reject(msg, true); // Let the next worker to retry!
      logger.verbose(`[RabbitMQ] reject with for ${jobDetails.jobId}`);
      logger.error(error);
      Sentry.captureException(error);
    }
  }, { noAck: false });
})()

async function startHealthCheckServer() {
  const http = require('http');
  const port = process.env.PORT || 3000;

  const server = http.createServer((req, res) => {
    if (!queueConnectionIsHealthy) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Unhealthy');
    } else {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Healthy');
    }
  });
  server.listen(port, () => {
    logger.info('Server running at port %s', port);
  });
}


