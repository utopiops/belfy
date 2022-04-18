// child jobs
import certificateSetup from '../certificate/setup';
import albSetup from '../environment/setup_alb';
import ecsClusterSetup from '../environment/setup_ecs_cluster';

export async function handleCertificate(req: any, res: any, queueName: any, body: any) {
  const certHandler = await certificateSetup(req, res);
  const { flow: certFlow } = await certHandler(queueName, {
    body: {
      environmentName: body.environmentName,
      environmentId: body.environmentId,
    },
  });
  return certFlow.job;
}

export async function handleAlb(req: any, res: any, queueName: any, body: any) {
  const albHandler = await albSetup(req, res);
  const { flow: albFlow } = await albHandler(queueName, {
    body: {
      environmentName: body.environmentName,
    },
  });
  return albFlow.job;
}

export async function handleEcsCluster(req: any, res: any, queueName: any, body: any) {
  const ecsClusterHandler = await ecsClusterSetup(req, res);
  const { flow: ecsClusterFlow } = await ecsClusterHandler(queueName, {
    body: {
      environmentName: body.environmentName,
    },
  });
  return ecsClusterFlow.job;
}
