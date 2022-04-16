const winston = require('winston'),
  expressWinston = require('express-winston');

const { createLogger, format, transports } = winston;
const env = process.env.NODE_ENV || 'development';

const expressAppLogger = expressWinston.logger({
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  ),
  meta: true, // optional: control whether you want to log the meta data about the request (default to true)
  msg: "HTTP {{req.method}} {{res.responseTime}}ms {{req.url}}", // optional: customize the default logging message. E.g. "{{res.statusCode}} {{req.method}} {{res.responseTime}}ms {{req.url}}"
  expressFormat: true, // Use the default Express/morgan request formatting. Enabling this will override any msg if true. Will only output colors with colorize set to true
  colorize: true, // Color the text and status code, using the Express/morgan color palette (text: gray, status: default green, 3XX cyan, 4XX yellow, 5XX red).
  ignoreRoute: function (req, res) { return false; } // optional: allows to skip some log messages based on request and/or response
});

const expressErrorLogger = expressWinston.errorLogger({
  transports: [
    new winston.transports.Console()
  ],
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.json()
  )
});


const defaultLogger = createLogger({
  level: env === 'development' ? 'verbose' : 'info',
  transports: [new transports.Console()],
  format: format.combine(
    format.errors({ stack: true }),
    format.colorize(),
    format.splat(),
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.printf(info => `${info.timestamp} ${info.level}: ${JSON.stringify(info.message)}`)
  ),
})


module.exports = {
  defaultLogger,
  expressAppLogger,
  expressErrorLogger,
}