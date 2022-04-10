// import constants from '../../constants';
import { Request, Response } from 'express';
import { Queue, JobNode, QueueEvents } from 'bullmq';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import generateWorker from '../../worker/generateWorker';
import { initiateJob } from './helpers';
import constants from '../utils/constants';
import config from '../utils/config';

async function handleRequest({
  req,
  res,
  handle,
  validationSchema,
}: {
  req: Request;
  res: Response;
  handle: (queueName: string) => Promise<{ flow?: JobNode; error?: { message: string; statusCode?: number } }>;
  validationSchema?: any;
}) {
  if (validationSchema) {
    try {
      validationSchema.validateSync(req.body);
    } catch (error: any) {
      res.status(constants.statusCodes.ue).send({ message: error.message });
      return;
    }
  }
  try {
    // init
    const tempJobConfig = constants.jobConfigs.flashSetup;
    const jobId = await initiateJob(
      tempJobConfig,
      res.locals.headers,
      res.locals.internal ? { accountId: req.body.accountId, userId: req.body.userId } : {},
    );
    res.locals.jobId = jobId;

    const queueName = jobId;
    const queue = new Queue(queueName, { connection: config.redisConnection });
    const QueueEvent = new QueueEvents(queueName, { connection: config.redisConnection });
    const queueAdaptor = new BullMQAdapter(queue);
    req.app.locals.addQueue(queueAdaptor);

    // todo: handle job configs
    res.status(constants.statusCodes.accepted).send({ jobId });

    // generate worker
    const worker = await generateWorker(queueName);
    console.log('🚀 ~ worker is ready');

    const result = await handle(queueName);
    console.log('🚀 ~ flow:', result);

    await result.flow?.job.waitUntilFinished(QueueEvent);

    worker.close(); // should gracefully shutdown the worker ONLY AFTER its jobs are done, we await the parent job just to be sure

    if (result.error) {
      res.status(result.error.statusCode || constants.statusCodes.ise).send({ message: result.error.message });
      return;
    }
  } catch (error) {
    console.error('error:', error);
    // res.sendStatus(constants.statusCodes.ise);
  }
}

export default handleRequest;
