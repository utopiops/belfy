import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import router from './routes';

const app = express();
const PORT = process.env.PORT ?? 3000;

const corsOptionsDelegate = (req: any, callback: (arg0: null, arg1: { credentials: boolean; origin: boolean }) => void) => {
  const corsOptions = { credentials: true, origin: true };
  callback(null, corsOptions);
};

app.use(cors(corsOptionsDelegate));

app.use(express.json());
app.use(express.text({ type: 'text/*' }));
app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.listen(PORT, () => {
  console.log(`The application is listening on port ${PORT}`);
});

app.use('/', router);
