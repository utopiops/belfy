const moment = require('moment');

exports.now = () => moment().utc({}).unix();

exports.secondsAfterNow = (seconds) => moment().utc({}).unix() + seconds;

exports.hasPassed = (time1, time2) => time1 > time2;

exports.prettyNow = () => moment().utc().format('YYYY MMM Do hh:mm');