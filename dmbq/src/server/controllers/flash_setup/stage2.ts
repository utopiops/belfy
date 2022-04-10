import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import handleRequest from '../handler';
import config from '../../utils/config';

// jobs
import createDomain from '../../jobs/domain/createDomain';
import deployDomain from '../../jobs/domain/deployDomain';

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
        name: 'domain setup',
        queueName,
        children: [
          { name: 'create domain', data: await createDomain(res.locals, body.domainName), queueName },
          { name: 'deploy domain', data: await deployDomain(res.locals, body.domainName), queueName },
        ],
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
