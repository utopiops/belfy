const { createLogger, format, transports } = require('winston');
const env = process.env.NODE_ENV || 'development';
// TODO: Send the logs to cloudwatch or store in a file

var options = {
    console: {
        level: 'verbose',
        handleExceptions: true,
        json: false,
        colorize: true,
    },
};

const logger = createLogger({
    level: env === 'development' ? 'verbose' : 'info',
    format: format.combine(
        format.errors({ stack: true }),
        format.colorize(),
        format.splat(),
        format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        format.printf(info => `[${process.env.HOSTNAME}] ${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports: [new transports.Console(options.console)]
});



module.exports = logger;