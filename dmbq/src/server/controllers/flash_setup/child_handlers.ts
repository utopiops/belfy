/* eslint-disable import/prefer-default-export */
// child jobs
import environmentSetup from '../environment/setup';

export async function handleEnvironment(req: any, res: any, queueName: any, env: any) {
  const envHandler = await environmentSetup(req, res);
  const { flow: envFlow } = await envHandler(queueName, {
    body: env,
  });
  return envFlow.job;
}
