/* eslint-disable object-curly-newline */
import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import yup from 'yup';
import handleRequest from '../handler';
import config from '../../utils/config';

// jobs
import destroyDynamicApplication from '../../jobs/dynamicApplication/destroyDynamicApplication';
import deleteDynamicApplication from '../../jobs/dynamicApplication/deleteDynamicApplication';

async function remove(req: Request, res: Response) {
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
      const flowProducer = new FlowProducer({ connection: config.redisConnection });

      const flow = await flowProducer.add({
        name: 'dynamicApplication remove',
        data: {
          isParentJob: true,
          name: 'dynamicApplication remove',
          details: res.locals,
        },
        queueName,
        children: [
          { name: 'create dynamicApplication', data: await destroyDynamicApplication(res.locals, body), queueName },
          { name: 'deploy dynamicApplication', data: await deleteDynamicApplication(res.locals, body), queueName },
        ],
      });

      return { flow };
    } catch (err: any) {
      console.log('error in dynamicApplication remove:', err);
      return {
        error: {
          message: err.message,
        },
      };
    }
  };

  await handleRequest({ req, res, handle, validationSchema });
}

export default remove;
