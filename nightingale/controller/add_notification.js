const { notify } = require('../models/notification/notification.service');
const { defaultLogger: logger } = require('../logger');

async function addNotification(req, res) {
  const event = req.body;
  notify(event);
  logger.info(`notification sent: ${JSON.stringify(event)}`);
  res.sendStatus(200);
}

module.exports = addNotification;
