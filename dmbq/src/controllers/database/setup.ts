import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import handleRequest from '../handler';
import config from '../../utils/config';

// jobs
import createDatabase from '../../jobs/database/createDatabase';
import activateDatabase from '../../jobs/database/activateDatabase';
import deployDatabase from '../../jobs/database/deployDatabase';
import setRdstSettings from '../../jobs/database/setRdstSettings';

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
        name: 'database setup',
        data: {
          isParentJob: true,
          name: 'database setup',
          isChildJob: false,
          details: res.locals,
        },
        queueName,
        children: [
          { name: 'create database', data: await createDatabase(res.locals, body), queueName },
          { name: 'activate database', data: await activateDatabase(res.locals, body.environmentName, body.name, 1), queueName },
          { name: 'deploy database', data: await deployDatabase(res.locals, body.environmentName, body.name, 1), queueName },
          { name: 'deploy database', data: await setRdstSettings(res.locals, body.environmentName, body.name), queueName },
        ],
      });

      return { flow };
    } catch (err: any) {
      console.log('error in database:', err);
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
