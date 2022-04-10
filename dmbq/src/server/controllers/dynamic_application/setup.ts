/* eslint-disable object-curly-newline */
import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import yup from 'yup';
import handleRequest from '../handler';
import config from '../../utils/config';

// jobs
import deployDynamicApplication from '../../jobs/dynamicApplication/deployDynamicApplication';
import createPipeline from '../../jobs/dynamicApplication/createPipeline';

async function setup(req: Request, res: Response) {
  const validationSchema = yup.object().shape({
    dynamicName: yup.string().lowercase().required(),
    applicationName: yup.string().required(),
    environmentName: yup.string().required(),
    accountId: yup.string().required(),
    userId: yup.string().required(),
  });

  const handle = async (
    queueName: string,
    // ? maybe there is a better way to specify this type expression
  ): Promise<{ flow?: JobNode; error?: { message: string; statusCode?: number } }> => {
    try {
      const { body } = req;
      console.log('🚀 ~ file: setup.ts ~ line 18 ~ setup ~ locals', res.locals);
      const flowProducer = new FlowProducer({ connection: config.redisConnection });

      const flow = await flowProducer.add({
        name: 'dynamicApplication setup',
        data: {
          isParentJob: true,
          name: 'dynamicApplication setup',
          details: res.locals,
        },
        queueName,
        children: [
          { name: 'create dynamicApplication', data: await deployDynamicApplication(res.locals, body), queueName },
          { name: 'deploy dynamicApplication', data: await createPipeline(res.locals, body), queueName },
        ],
      });

      return { flow };
    } catch (err: any) {
      console.log('error in dynamicApplication setup:', err);
      return {
        error: {
          message: err.message,
        },
      };
    }
  };

  await handleRequest({ req, res, handle, validationSchema });
}

export default setup;
