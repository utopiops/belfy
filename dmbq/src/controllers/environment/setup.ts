/* eslint-disable consistent-return */
import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import handleRequest from '../handler';
import config from '../../utils/config';

// jobs
import createEnvironment from '../../jobs/environment/createEnvironment';
import createAndDeployProvider from '../../jobs/provider/createAndDeployProvider';
import activateEnvironment from '../../jobs/environment/activateEnvironment';
import deployEnvironment from '../../jobs/environment/deployEnvironment';

async function setup(req: Request, res: Response): Promise<any> {
  // TODO: add validation
  const handle = async (
    queueName: string,
    dataBag?: any,
    // ? maybe there is a better way to specify this type expression
  ): Promise<{ flow?: JobNode; error?: { message: string; statusCode?: number } }> => {
    try {
      const { body } = res.locals.isChildJob ? dataBag : req;
      const providerName = `${body.name}-provider`;
      const flowProducer = new FlowProducer({ connection: config.redisConnection });

      const flow = await flowProducer.add({
        name: 'environment setup',
        data: {
          isParentJob: true,
          name: 'environment setup',
          isChildJob: !!res.locals.isChildJob,
          details: res.locals,
        },
        queueName,
        children: [
          {
            name: 'provider creation and deployment',
            data: await createAndDeployProvider(res.locals, providerName, body.region, body.accessKeyId, body.secretAccessKey),
            queueName,
          },
          {
            name: 'create Environment',
            data: await createEnvironment(res.locals, providerName, body.region, body),
            queueName,
          },
          {
            name: 'activate Environment',
            data: await activateEnvironment(res.locals, body.name, 1),
            queueName,
          },
          {
            name: 'deploy Environment',
            data: await deployEnvironment(res.locals, body.name, 1),
            queueName,
          },
        ],
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

export default setup;
