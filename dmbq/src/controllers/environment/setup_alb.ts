/* eslint-disable consistent-return */
import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import handleRequest from '../handler';
import config from '../../utils/config';

// jobs
import createAlb from '../../jobs/environment/createAlb';
import createAlbListener from '../../jobs/environment/createAlbListener';

async function setupAlb(req: Request, res: Response): Promise<any> {
  // TODO: add validation
  const handle = async (
    queueName: string,
    dataBag?: any,
    // ? maybe there is a better way to specify this type expression
  ): Promise<{ flow?: JobNode; error?: { message: string; statusCode?: number } }> => {
    try {
      const { body } = res.locals.isChildJob ? dataBag : req;
      const flowProducer = new FlowProducer({ connection: config.redisConnection });

      const children = [
        // TODO: this needs to be refactored
        {
          name: 'create alb',
          data: await createAlb(res.locals, body.environmentName, res.locals.environmentVersion, res.locals.isNewVersion),
          queueName,
        },
      ];

      if (!res.locals.isNewVersion) {
        res.locals.environmentVersion += 1;
        res.locals.isNewVersion = true;
      }

      children.push(
        {
          name: 'create alb listener for https',
          data: await createAlbListener(res.locals, body.environmentName, res.locals.environmentVersion, 'https'),
          queueName,
        },
        {
          name: 'create alb listener for http',
          data: await createAlbListener(res.locals, body.environmentName, res.locals.environmentVersion, 'http'),
          queueName,
        },
      );

      const flow = await flowProducer.add({
        name: 'alb setup for environment',
        data: {
          isParentJob: true,
          name: 'alb setup for environment',
          isChildJob: !!res.locals.isChildJob,
          details: res.locals,
        },
        queueName,
        children,
      });

      return { flow };
    } catch (err: any) {
      console.log('error in Environment setup:', err);
      return {
        error: {
          message: err.message,
        },
      };
    }
  };

  if (res.locals.isChildJob) return handle;

  await handleRequest({ req, res, handle });
}

export default setupAlb;
