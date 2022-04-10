/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
import { Worker } from 'bullmq';
import c from 'ansi-colors';
import { handleJob, sendLog } from './jobHandler';
import config from '../server/utils/config';

async function generateWorker(queueName: string) {
  let lineNumber = 1;
  // const worker = new Worker(queueName, async (job) => {
  //   console.log(job.data.type);

  //   const pr = new Promise((resolve, reject) => {
  //     let counter = 0;
  //     const interval = setInterval(async () => {
  //       counter += 1;
  //       console.log(job.data.type, '---', counter);
  //       if (counter > 3) {
  //         reject({ message: `${job.data.type} failed!` });
  //         // resolve({ message: 'cool!' });
  //         clearInterval(interval);
  //       }
  //     }, 2000);
  //   });
  //   console.log('🚀 ~ file: generateWorker.ts ~ line 25 ~ worker ~ pr', pr);
  //   return pr;
  // });

  const worker = new Worker(
    queueName,
    async (job) => {
      job.data.details.lineNumber = lineNumber;
      if (job.data.isParentJob) {
        console.log('🚀 ~ file: parentJob.ts ~ line 32 ~ job', job.data);
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
