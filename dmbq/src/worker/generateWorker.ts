/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
import { Worker } from 'bullmq';
import c from 'ansi-colors';
import { handleJob, sendLog } from './jobHandler';
import config from '../utils/config';

async function generateWorker(queueName: string) {
  let lineNumber = 1;
  const worker = new Worker(
    queueName,
    async (job) => {
      job.data.details.lineNumber = lineNumber;
      if (job.data.isParentJob) {
        sendLog(job.data.details, `${c.green(` ${job.data.name} completed successfully.`)}`, !job.data.isChildJob);
        return;
      }
      console.log('starting to process', job.data.description);
      const result = await handleJob(job.data);
      return result;
    },
    {
      connection: config.redisConnection,
    },
  );

  worker.on('completed', (job, result) => {
    lineNumber = job.data.details?.lineNumber;
    console.log(`${job.id} has completed!`, result);
  });

  worker.on('failed', (job, err) => {
    console.log(`${job.id} has failed with error: ${err}`);
    console.log('job data:', job.data);
    sendLog(job.data.details, `${c.cyan(job.data.details.name)} - ${c.red(`${job.data.description} failed!`)}`, true);
    worker.close();
  });

  worker.on('error', (err) => {
    console.log('unexpected error:', err);
    worker.close();
  });

  return worker;
}

export default generateWorker;
