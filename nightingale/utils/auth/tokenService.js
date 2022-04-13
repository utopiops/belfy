const jwt_decode = require('jwt-decode');
const jwt = require('jsonwebtoken');
const { defaultLogger: logger } = require('../../logger');

module.exports.getUserIdFromToken = (token) => {
  try {
    return jwt_decode(token).user._id;
  } catch (e) {
    logger.error(e.message);
    return null;
  }
};

module.exports.getAccountIdFromToken = (token) => {
  try {
    return jwt_decode(token).user.accountId;
  } catch (e) {
    logger.error(e.message);
    return null;
  }
};

module.exports.authorize = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET, (err, authorizedData) => {
      if (err) {
        logger.error(err);
        return false;
      }
      return true;
    });
  } catch (e) {
    logger.error(e.message);
    return false;
  }
};
