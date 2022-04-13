require('dotenv').config();
const express = require('express');
const http = require('http');
const { defaultLogger: logger } = require('./logger');
const { Server } = require('socket.io');
const cors = require('cors');
const notification = require('./controller/index');
const notificationEventEmitter = require('./event');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const { introspectOAuth2Token } = require('./utils/auth/introspectOAuth2Token');
const { getAccountDetails } = require('./utils/auth/getAccountDetails');
const tokenService = require('./utils/auth/tokenService');

const app = express();

const corsOptionsDelegate = function (req, callback) {
  const corsOptions = { credentials: true, origin: true };
  callback(null, corsOptions)
}
app.use(cors(corsOptionsDelegate));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const pubClient = createClient({
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
});
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));

const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/notification', async (req, res, next) => {
  const accessToken = req.headers.authorization?.split(' ')[1];
  const isValid = await introspectOAuth2Token(accessToken);
  if (isValid) {
    return next();
  }
  // support old jwt tokens
  const isOldToken = tokenService.authorize(accessToken);
  if (isOldToken) {
    return next();
  } 
  res.status(401).send('Unauthorized');
} , notification);
app.use('/health', (req, res) => res.sendStatus(200));

app.use('/static', express.static('static'));

io.use(async (socket, next) => {
  const token = socket.handshake.auth.access_token;
  if (await introspectOAuth2Token(token)) {
    logger.info('successfully authorized');
    next();
  } else {
    logger.info(`not authorized. token: ${token}`);
    const err = new Error('not authorized');
    err.data = { content: 'Please retry later' }; // additional details
    next(err);
  }
});

notificationEventEmitter.on('job received', (event) => {
  const eventParsed = event;

  logger.verbose(
    'received a new message: ' +
      `${eventParsed.accountId}${
        eventParsed.userId ? `:${eventParsed.userId}` : ''
      }`,
  );
  io.to(
    `${eventParsed.accountId}${
      eventParsed.userId ? `:${eventParsed.userId}` : ''
    }`,
  ).emit(eventParsed.category, eventParsed.dataBag);
});

io.on('connection',async (socket) => {
  logger.verbose(`[socket.io] client connected: ${socket.id}`);
  const idToken = socket.handshake.auth.id_token;
  let { accountId, userId } = await getAccountDetails(idToken);
  // support old jwt tokens
  if (!accountId && !userId) {
    accountId = tokenService.getAccountIdFromToken(token);
    userId = tokenService.getUserIdFromToken(token);
  }
  console.log(`accountId, userId`, accountId, userId);
  socket.join(accountId);
  socket.join(`${accountId}:${userId}`);

  socket.on('disconnect', () => {
    logger.verbose(`[socket.io] client disconnected: ${socket.id}`);
  });

});

server.listen(PORT, () => {
  logger.info(`Listening on port ${PORT}`);
});