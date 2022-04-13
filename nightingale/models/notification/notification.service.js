const notificationEventEmitter = require('../../event');

module.exports = {
  notify,
};

async function notify(event) {
  // emit an event with the vent details
  notificationEventEmitter.emit('job received', event);
}
