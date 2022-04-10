import mongoose from 'mongoose';
import config from '../utils/config';

const option = {
  // useCreateIndex: true,
  useNewUrlParser: true,
};
mongoose.set('debug', true);
// @ts-ignore
mongoose.connect(config.dbUrl, option);

// should mongoose.connection be put in the call back of mongoose.connect???
const db = mongoose.connection;
db.on('error', (err) => {
  console.log(`There was an error connecting to the database: ${err}`);
});
db.once('open', () => {
  console.log('Successfully connected to mongo database');
});
// When the connection is disconnected
db.on('disconnected', () => {
  console.log('Mongoose default connection disconnected');
  // todo: either retry (if required) or exit(1)
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('Mongoose default connection disconnected through app termination');
    process.exit(0);
  });
});

export default db;
