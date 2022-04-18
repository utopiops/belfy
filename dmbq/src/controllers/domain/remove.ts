// TODO: this file structure is 90% repetitive, maybe we can extract this into a separate file and use it in all the controllers
import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import handleRequest from '../handler';
import config from '../../utils/config';

// jobs
import destroyDomain from '../../jobs/domain/destroyDomain';
import deleteDomain from '../../jobs/domain/deleteDomain';

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
        name: 'domain remove',
        data: {
          isParentJob: true,
          name: 'domain remove',
          isChildJob: false,
          details: res.locals,
        },
        queueName,
        children: [
          { name: 'create domain', data: await destroyDomain(res.locals, body.domainName), queueName },
          { name: 'deploy domain', data: await deleteDomain(res.locals, body.domainName), queueName },
        ],
      });

      return { flow };
    } catch (err: any) {
      console.log('error in domain remove:', err);
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
