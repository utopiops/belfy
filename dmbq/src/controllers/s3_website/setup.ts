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

      const children = [];

      res.locals.isChildJob = true; // todo: rename to childJobCall || internalCall || ...

      await handleCertificate(req, res, queueName, {
        environmentName: body.environmentName,
        environmentId,
      });

      children.push(
        {
          name: 'create s3-website',
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
      );

      if (body.integrationName) {
        children.push({
          name: 'create Pipeline',
          data: await createPipeline(res.locals, body.environmentName, body.name, 's3_website'),
          queueName,
        });
      }

      const flow = await flowProducer.add({
        name: 's3-website setup',
        queueName,
        data: {
          isParentJob: true,
          name: 's3-website setup',
          isChildJob: false,
          details: res.locals,
        },
        children,
      });

      return { flow };
    } catch (err: any) {
      console.log('error in s3 setup:', err);
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
