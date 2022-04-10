/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import handleRequest from '../handler';
import config from '../../utils/config';

// children
import { handleEnvironment } from './child_handlers';

async function setup(req: Request, res: Response) {
  // TODO: add validation
  const handle = async (
    queueName: string,
    // ? maybe there is a better way to specify this type expression
  ): Promise<{ flow?: JobNode; error?: { message: string; statusCode?: number } }> => {
    try {
      const { body } = req;
      const flowProducer = new FlowProducer({ connection: config.redisConnection });
      res.locals.isChildJob = true;

      for (const env of body.environments) {
        await handleEnvironment(req, res, queueName, env);
      }

      const flow = await flowProducer.add({
        name: 'ecs setup',
        queueName,
      });

      return { flow };
    } catch (err: any) {
      console.log('error in domain setup:', err);
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
