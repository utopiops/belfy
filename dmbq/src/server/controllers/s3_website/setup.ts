/* eslint-disable object-curly-newline */
import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import handleRequest from '../handler';
import config from '../../utils/config';
import { getEnvironmentId } from '../environment/helpers';

// jobs
import createS3Website from '../../jobs/managed_application/createS3Website';
import activateApplication from '../../jobs/managed_application/activateApplication';
import deployApplication from '../../jobs/managed_application/deployApplication';
import createPipeline from '../../jobs/managed_application/createPipeline';

// child handlers
import { handleCertificate } from './child_handlers';

async function setup(req: Request, res: Response): Promise<any> {
  // TODO: add validation
  const handle = async (
    queueName: string,
    // ? maybe there is a better way to specify this type expression
  ): Promise<{ flow?: JobNode; error?: { message: string; statusCode?: number } }> => {
    try {
      const { body } = req;
      const environmentId = await getEnvironmentId(res.locals.accountId, body.environmentName);

      const flowProducer = new FlowProducer({ connection: config.redisConnection });

      res.locals.isChildJob = true; // todo: rename to childJobCall || internalCall || ...

      const certificateParentJob = await handleCertificate(req, res, queueName, {
        environmentName: body.environmentName,
        environmentId,
      });

      const flow = await flowProducer.add({
        name: 'ecs setup',
        queueName,
        children: [
          certificateParentJob,
          {
            name: 'create ecs',
            data: await createS3Website(res.locals, body.environmentName, environmentId, body),
            queueName,
          },
          {
            name: 'activate Application',
            data: await activateApplication(res.locals, body.environmentName, environmentId, body.name, 's3_website', 1),
            queueName,
          },
          {
            name: 'deploy Application',
            data: await deployApplication(res.locals, body.environmentName, environmentId, body.name, 1),
            queueName,
          },
          {
            name: 'create Pipeline', // todo: check for git integration
            data: await createPipeline(res.locals, body.environmentName, body.name, 's3_website'),
            queueName,
          },
        ],
      });

      return { flow };
    } catch (err: any) {
      console.log('error in ecs setup:', err);
      return {
        error: {
          message: err.message,
        },
      };
    }
  };

  // if (res.locals.internalUse) return handle;

  await handleRequest({ req, res, handle });
}

export default setup;
