import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import handleRequest from '../handler';
import config from '../../utils/config';

// jobs
import destroyFmApp from '../../jobs/fm_static_website/destroyFmApp';
import deleteFmApp from '../../jobs/fm_static_website/deleteFmApp';

async function remove(req: Request, res: Response) {
  // TODO: add validation
  const handle = async (
    queueName: string,
    // ? maybe there is a better way to specify this type expression
  ): Promise<{ flow?: JobNode; error?: { message: string; statusCode?: number } }> => {
    try {
      const { body } = req;
      const flowProducer = new FlowProducer({ connection: config.redisConnection });

      const flow = await flowProducer.add({
        name: 'fm static website remove',
        data: {
          isParentJob: true,
          name: 'fm static website remove',
          isChildJob: false,
          details: res.locals,
        },
        queueName,
        children: [
          { name: 'create fm static website', data: await destroyFmApp(res.locals, body.name), queueName },
          { name: 'deploy fm static website', data: await deleteFmApp(res.locals, body.name), queueName },
        ],
      });

      return { flow };
    } catch (err: any) {
      console.log('error in fm static website remove:', err);
      return {
        error: {
          message: err.message,
        },
      };
    }
  };

  await handleRequest({ req, res, handle });
}

export default remove;
