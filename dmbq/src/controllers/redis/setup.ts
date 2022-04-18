import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import handleRequest from '../handler';
import config from '../../utils/config';

// jobs
import CreateRedis from '../../jobs/redis/CreateRedis'; // ! upper case CreateRedis needs to be changed
import activateRedis from '../../jobs/redis/activateRedis';
import deployRedis from '../../jobs/redis/deployRedis';

async function setup(req: Request, res: Response) {
  // TODO: add validation
  const handle = async (
    queueName: string,
    // ? maybe there is a better way to specify this type expression
  ): Promise<{ flow?: JobNode; error?: { message: string; statusCode?: number } }> => {
    try {
      const flowProducer = new FlowProducer({ connection: config.redisConnection });

      const flow = await flowProducer.add({
        name: 'redis setup',
        data: {
          isParentJob: true,
          name: 'redis setup',
          isChildJob: false,
          details: res.locals,
        },
        queueName,
        children: [
          { name: 'create redis', data: await CreateRedis(req.body, res.locals), queueName },
          { name: 'activate redis', data: await activateRedis(req.body, res.locals), queueName },
          { name: 'deploy redis', data: await deployRedis(req.body, res.locals), queueName },
        ],
      });

      return { flow };
    } catch (err: any) {
      console.log('error in static website setup:', err);
      return {
        error: {
          message: err.message,
        },
      };
    }
  };

  await handleRequest({ req, res, handle });
}

export default setup;
