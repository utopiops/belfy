/* eslint-disable object-curly-newline */
import { FlowProducer, JobNode } from 'bullmq';
import { Request, Response } from 'express';
import handleRequest from '../handler';
import config from '../../utils/config';
import { findLegitimateAlb, findLegitimateCluster, getEnvironmentVersion, getEnvironmentId } from '../environment/helpers';

// jobs
import createEcs from '../../jobs/managed_application/createEcs';
import activateApplication from '../../jobs/managed_application/activateApplication';
import deployApplication from '../../jobs/managed_application/deployApplication';
import createPipeline from '../../jobs/managed_application/createPipeline';
import activateEnvironment from '../../jobs/environment/activateEnvironment';
import deployEnvironment from '../../jobs/environment/deployEnvironment';

// child handlers
import { handleCertificate, handleAlb, handleEcsCluster } from './child_handlers';

async function setup(req: Request, res: Response): Promise<any> {
  // TODO: add validation
  const handle = async (
    queueName: string,
    // ? maybe there is a better way to specify this type expression
  ): Promise<{ flow?: JobNode; error?: { message: string; statusCode?: number } }> => {
    try {
      const { body } = req;
      res.locals.environmentVersion = await getEnvironmentVersion(res.locals.accountId, body.environmentName);
      res.locals.isNewVersion = false;
      const environmentId = await getEnvironmentId(res.locals.accountId, body.environmentName);
      const legitimateAlb = await findLegitimateAlb(res.locals.accountId, body.environmentName, res.locals.environmentVersion);
      const legitimateCluster = await findLegitimateCluster(
        res.locals.accountId,
        body.environmentName,
        res.locals.environmentVersion,
      );
      const children = [];

      const flowProducer = new FlowProducer({ connection: config.redisConnection });

      res.locals.isChildJob = true; // todo: rename to childJobCall || internalCall || ...

      await handleCertificate(req, res, queueName, {
        environmentName: body.environmentName,
        environmentId,
      });

      if (!legitimateAlb) {
        await handleAlb(req, res, queueName, body);
      }

      if (!legitimateCluster) {
        await handleEcsCluster(req, res, queueName, body);
      }

      if (res.locals.isNewVersion) {
        children.push(
          {
            name: 'activate Environment',
            data: await activateEnvironment(res.locals, body.environmentName, res.locals.environmentVersion),
            queueName,
          },
          {
            name: 'deploy Environment',
            data: await deployEnvironment(res.locals, body.environmentName, res.locals.environmentVersion),
            queueName,
          },
        );
      }

      children.push(
        {
          name: 'create ecs',
          data: await createEcs(res.locals, body.environmentName, environmentId, body, legitimateAlb, legitimateCluster),
          queueName,
        },
        {
          name: 'activate Application',
          data: await activateApplication(res.locals, body.environmentName, environmentId, body.name, 'ecs', 1),
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
          name: 'create Pipeline', // todo: check for git integration
          data: await createPipeline(res.locals, body.environmentName, body.name, 'ecs'),
          queueName,
        });
      }

      const flow = await flowProducer.add({
        name: 'ecs setup',
        queueName,
        children,
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
