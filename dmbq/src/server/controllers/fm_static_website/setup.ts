import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import handleRequest from '../handler';
import config from '../../utils/config';

// jobs
import createAndDeployFmStatic from '../../jobs/fm_static_website/createAndDeployFmStatic';
import createFmPipeline from '../../jobs/fm_static_website/createFmPipeline';

async function setup(req: Request, res: Response) {
  // TODO: add validation
  const handle = async (
    queueName: string,
    // ? maybe there is a better way to specify this type expression
  ): Promise<{ flow?: JobNode; error?: { message: string; statusCode?: number } }> => {
    try {
      const { body } = req;
      const flowProducer = new FlowProducer({ connection: config.redisConnection });

      const flow = await flowProducer.add({
        name: 'fm static website setup',
        data: {
          isParentJob: true,
          name: 'fm static website setup',
          details: res.locals,
        },
        queueName,
        children: [
          { name: 'create fm static website', data: await createAndDeployFmStatic(res.locals, body), queueName },
          { name: 'deploy fm static website', data: await createFmPipeline(res.locals, body.name), queueName },
        ],
      });

      return { flow };
    } catch (err: any) {
      console.log('error in fm static website setup:', err);
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
