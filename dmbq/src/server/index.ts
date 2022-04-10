import 'dotenv/config';
import './db';
import { Queue } from 'bullmq';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import router from './routes';
import config from './utils/config';

const mainQueue = new Queue('main', { connection: config.redisConnection });

// require('./db');
// ----ui----
const serverAdapter = new ExpressAdapter();

const { addQueue } = createBullBoard({
  queues: [new BullMQAdapter(mainQueue)],
  serverAdapter,
});

const app = express();

serverAdapter.setBasePath('/admin/queues');
app.use('/admin/queues', serverAdapter.getRouter());
app.locals.addQueue = addQueue;
// ----ui----

const corsOptionsDelegate = function (req: any, callback: (arg0: null, arg1: { credentials: boolean; origin: boolean }) => void) {
  const corsOptions = { credentials: true, origin: true };
  callback(null, corsOptions); // callback expects two parameters: error and options
};

app.use(cors(corsOptionsDelegate));

app.use(cookieParser());
app.use(express.json());
app.use(express.text({ type: 'text/*' }));
app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.listen(3000, () => {
  console.log('The application is listening on port 3000!');
});

app.use('/', router);
