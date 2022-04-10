/* eslint-disable consistent-return */
import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import handleRequest from '../handler';
import config from '../../utils/config';

// jobs
import createEcsCluster from '../../jobs/environment/createEcsCluster';
import createEcsClusterInstanceGroup from '../../jobs/environment/createEcsClusterInstanceGroup';

async function setupEcsCluster(req: Request, res: Response): Promise<any> {
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
          name: 'create ecs cluster',
          data: await createEcsCluster(res.locals, body.environmentName, res.locals.environmentVersion, res.locals.isNewVersion),
          queueName,
        },
      ];

      if (!res.locals.isNewVersion) {
        res.locals.environmentVersion += 1;
        res.locals.isNewVersion = true;
      }

      children.push({
        name: 'create instance-group',
        data: await createEcsClusterInstanceGroup(res.locals, body.environmentName, res.locals.environmentVersion),
        queueName,
      });

      const flow = await flowProducer.add({
        name: 'ecs cluster setup for environment',
        data: {
          isParentJob: true,
          name: 'ecs cluster setup for environment',
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

export default setupEcsCluster;
