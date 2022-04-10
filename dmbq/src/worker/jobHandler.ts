/* eslint-disable no-bitwise */
/* eslint-disable prefer-promise-reject-errors */
/* eslint-disable no-param-reassign */
import axios from 'axios';
import mongoose from 'mongoose';
import c from 'ansi-colors';
import config from '../server/utils/config'; // ! importing from server doesn't make sense.
import { setCertificateIdentifier, setProviderId, setCertificateArn } from './helperFunctions';

const { ObjectId } = mongoose.Types;

async function fillerFunction(job: any) {
  switch (job.description) {
    case 'certificate activation':
    case 'certificate deployment':
      await setCertificateIdentifier(job);
      break;
    case 'environment creation':
      await setProviderId(job);
      break;
    case 'alb-listener creation for https':
    case 'static-website application creation':
      await setCertificateArn(job);
      break;

    default:
      break;
  }
}

// note: make this function handle log structure and colors all by it self.
// todo: add emojis to log
async function sendLog(details: any, log: string, isLastLine: boolean = false, sameLine: boolean = false) {
  console.log('🚀 ~ file: jobHandler.ts ~ line 34 ~ sendLog ~ log', log);
  console.log('🚀 ~ file: jobHandler.ts ~ line 34 ~ sendLog ~ isLastLine', isLastLine);
  try {
    axios({
      method: 'post',
      url: `${config.lsmUrl}/log/job`,
      params: {
        jobId: details.jobId,
      },
      data: {
        jobId: details.jobId,
        lineNumber: details.lineNumber,
        payload: log.toString(),
        isLastLine,
      },
      headers: details.headers,
    });
    if (!sameLine) details.lineNumber += 1; // passing the details object is a pass by reference.
  } catch (error) {
    console.log('error sending log: ', error);
  }
}

function prettyTime(time: number) {
  // minutes and seconds
  const mins = ~~(time / 60); // ~~ is a short way of flooring a number
  const secs = ~~time % 60;
  return `${mins > 0 ? `${mins}m` : ''}${secs}s`;
}

async function waitForAction(job: any) {
  return new Promise((resolve, reject) => {
    let counter = 0;
    console.log('waiting for', job.collection, job.filter);
    const interval = setInterval(async () => {
      try {
        counter += 5;
        const doc = await mongoose.connection.db.collection(job.collection).findOne(job.filter);
        sendLog(
          job.details,
          `${c.cyan(job.details.name)} - ${job.description} is in progress... (${prettyTime(counter)} elapsed)`,
          // false,
          // true,
        );
        // @ts-ignore
        let code = doc?.state.code;
        console.log('🚀 ~ file: jobHandler.ts ~ line 80 ~ interval ~ doc', doc);
        if (job.details.isDynamic) {
          // @ts-ignore
          const index = doc.dynamicNames.findIndex(
            (dynamicName: { name: any }) => dynamicName.name === job.body.variables.dynamicName,
          );
          console.log('🚀 ~ file: jobHandler.ts ~ line 85 ~ interval ~ index', index);
          // @ts-ignore
          code = doc?.dynamicNames[index].state.code;
        }
        if (code === `${job.type}ed`) {
          resolve(`${job.type}ed`);
          clearInterval(interval);
        } else if (code === `${job.type}_failed` || counter > 1800) {
          // 30 minutes timeout
          reject({ message: `${job.description} failed!` });
          clearInterval(interval);
        }
      } catch (err) {
        console.log('error while waiting for deploy:', err);
        reject({ message: `${job.description} failed!` });
        clearInterval(interval);
      }
    }, 5000);
  });
}

async function handleJob(job: any) {
  await fillerFunction(job);
  console.log('🚀 after factory job:', job);
  if (job.filter) {
    // ! start temporary dumb code:
    if (job.filter.environment) job.filter.environment = new ObjectId(job.filter.environment); // todo: this is dumb, fix it.
    if (job.filter.domainId) job.filter.domainId = new ObjectId(job.filter.domainId); // todo: this is dumb, fix it.
    if (job.filter.accountId) job.filter.accountId = new ObjectId(job.filter.accountId); // todo: this is dumb, fix it.
    // ! end temporary dumb code

    const doc = await mongoose.connection.db.collection(job.collection).findOne(job.filter);
    // @ts-ignore
    if (doc) {
      console.log('🚀 ~ file: helpers.ts ~ line 87 ~ handleJob ~ doc skipped');
      sendLog(job.details, `${c.cyan(job.details.name)} - ${job.description} skipped. it's already done.`);
      return {
        success: true,
      };
    }
  }

  // axios throws error if the response was a 4XX / 5XX. we handle it in handleRequest function.
  const result = await axios({
    method: job.method,
    data: job.body,
    url: job.url,
    headers: job.details.headers,
  });

  if (job.type === 'deploy' || job.type === 'destroy') {
    sendLog(job.details, `${c.cyan(job.details.name)} - ${job.description} started...`);
    // we delete these fields so that waitForDeploy can find the correct state value
    delete job.filter['state.code'];
    delete job.filter.deployedVersion;
    if (job.details.isDynamic) {
      delete job.filter['dynamicNames.name'];
      delete job.filter.dynamicNames;
      delete job.filter.$or;
    }
    // we handle the rejection in handleRequest function.
    await waitForAction(job);
  }

  sendLog(job.details, `${c.cyan(job.details.name)} - ${c.green(`${job.description} succeeded. 🚀`)}`);

  return {
    success: true,
    data: result.data,
  };
}

export { handleJob, sendLog };
