/* eslint-disable consistent-return */
import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import handleRequest from '../handler';
import config from '../../utils/config';

// jobs
import createCertificate from '../../jobs/certificate/createCertificate';
import activateCertificate from '../../jobs/certificate/activateCertificate';
import deployCertificate from '../../jobs/certificate/deployCertificate';

async function setup(req: Request, res: Response): Promise<any> {
  // TODO: add validation
  const handle = async (
    queueName: string,
    dataBag?: any,
    // ? maybe there is a better way to specify this type expression
  ): Promise<{ flow?: JobNode; error?: { message: string; statusCode?: number } }> => {
    try {
      const { body } = res.locals.isChildJob ? dataBag : req;
      console.log('🚀 ~ file: setup.ts ~ line 21 ~ setup ~ body', body);
      const flowProducer = new FlowProducer({ connection: config.redisConnection });

      const flow = await flowProducer.add({
        name: 'certificate setup',
        data: {
          isParentJob: true,
          name: 'certificate setup',
          isChildJob: res.locals.isChildJob,
          details: res.locals,
        },
        queueName,
        children: [
          {
            name: 'create Certificate',
            data: await createCertificate(res.locals, body.environmentName, body.environmentId, body.region),
            queueName,
          },
          {
            name: 'activate Certificate',
            data: await activateCertificate(res.locals, body.environmentName, body.environmentId, body.region),
            queueName,
          },
          {
            name: 'deploy Certificate',
            data: await deployCertificate(res.locals, body.environmentName, body.environmentId, body.region),
            queueName,
          },
        ],
      });

      return { flow };
    } catch (err: any) {
      console.log('error in Certificate setup:', err);
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
