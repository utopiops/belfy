require('dotenv').config();
const express = require('express');
const mainRoute = require('./routes');
const preloadHandler = require('./utils/preload');
const cors = require('cors');
const cookieParser = require("cookie-parser");
const auth = require('./components/auth');
const webhook = require('./components/webhook');
const healthCheck = require('./components/healthcheck');
const userController = require('./components/user/userController')
const passport = require('./passport');
const logger = require('./logger');
const { handleSnsMessage } = require('./db/models/alarm_v2/alarm.service');
const { introspectOAuth2Token } = require('./middlewares/introspectOAuth2Token')
const { getAccessTokenAccount } = require('./middlewares/getAccessTokenAccount'); 
const { getProviderWithCredentialsV2 } = require('./middlewares/getProviderV2');
const { handler: deployApplication } = require('./controllers/application/deployApplication');
const { handler: uploadStaticWebsite } = require('./controllers/utopiops_application/uploadStaticWebsite');
const { handler: demoRequest } = require('./controllers/demo_request/handler');

require('newrelic');

// This is required to initialize connection to mongodb
require('./db');

const Sentry = require('@sentry/node');
const Tracing = require("@sentry/tracing");

// const winston = require('winston'),
//   expressWinston = require('express-winston');
// const logger = expressWinston.logger({
//   transports: [
//     new winston.transports.Console()
//   ],
//   format: winston.format.combine(
//     winston.format.colorize(),
//     winston.format.json()
//   ),
//   meta: true, // optional: control whether you want to log the meta data about the request (default to true)
//   msg: "HTTP {{req.method}} {{res.responseTime}}ms {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
//   expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
//   colorize: true, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
//   ignoreRoute: function (req, res) { return false; } // optional: allows to skip some log messages based on request and/or response
// });

const app = express();

Sentry.init({
  dsn: process.env.SENTRY_DNS,
  debug: true,
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app }),
  ],

  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

app.use(cookieParser());
app.use(passport.initialize());
app.use(logger.expressAppLogger);
app.use(express.json());
app.use(express.text({ type: 'text/*' }))
app.use(express.urlencoded({
  extended: true
}));

const preload = new preloadHandler();
preload.prepare();

var corsOptionsDelegate = function (req, callback) {
  var corsOptions = { credentials: true, origin: true };
  // if (req.header('Origin').endsWith('utopiops.com')) {
  //   corsOptions = { credentials: true, origin: true } // reflect (enable) the requested origin in the CORS response
  // } else {
  //   corsOptions = { credentials: true, origin: false } // disable CORS for this request
  // }
  callback(null, corsOptions) // callback expects two parameters: error and options
}

app.use(cors(corsOptionsDelegate));

app.use('/auth', auth);
app.use('/account', auth); // TODO: remove when all the portal branches are updated. This is added just for backwards compatibility
app.use('/webhook', webhook);
app.use('/health', healthCheck);
app.patch('/user/myPassword', userController.setPassword); // This is for activating account
app.post('/v3/logmetric/alarm/environment/sns', handleSnsMessage); //sns endpoint
app.post('/applications/utopiops/upload/static-website', uploadStaticWebsite); // upload static website from landing page
app.post('/request-demo', demoRequest); // request demo from landing page
app.post( // This is for pipeline deployments and use basic access token
  "/v3/applications/environment/name/:environmentName/application/name/:applicationName/pipeline-deploy",
  getAccessTokenAccount(),
  getProviderWithCredentialsV2({ routeParam: "environmentName" }),
  deployApplication
);
app.use(
  '/',
  (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user, info) => {
      if (err) return next(err);
      if (!user) return next();
      res.locals.old = true;
      if (user.internal) {
        console.log('old internal call...');
        res.locals.internal = true;
        return next();
      }
      req.logIn(user, function(err) {
        if (err) { return next(err); }
        console.log('logged in using jwt token');
        return next();
      });
      // Handle your authentication here.
    })(req, res, next);
  },
  introspectOAuth2Token,
  mainRoute,
);

// RequestHandler creates a separate execution context using domains, so that every
// transaction/span/breadcrumb is attached to its own Hub instance
app.use(Sentry.Handlers.requestHandler());
// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

// The error handler must be before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// This must be after app.use(router)
app.use(logger.expressErrorLogger);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  res.status(404)        // HTTP status 404: NotFound
    .send('Not found');
});

module.exports = app;