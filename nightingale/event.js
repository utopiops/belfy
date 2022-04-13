const EventEmitter = require('events');

class NotificationEventEmitter extends EventEmitter {}

const defaultEmitter = new NotificationEventEmitter();

module.exports = defaultEmitter;
