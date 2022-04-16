var jwt_decode = require('jwt-decode');

module.exports.getUserIdFromToken = (req) => {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') { // Authorization: Bearer g1jipjgi1ifjioj
        // Handle token presented as a Bearer token in the Authorization header
        try {
            const token = req.headers.authorization.split(' ')[1];
            return jwt_decode(token).user._id;
        } catch (e) {
            // todo: log it
            console.log(`error: ${e.message}`);
            return null;
        }
    } else {
        return null;
    }
}

module.exports.getAccountIdFromToken = (req) => {
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') { // Authorization: Bearer <token>
        // Handle token presented as a Bearer token in the Authorization header
        try {
            const token = req.headers.authorization.split(' ')[1];
            return jwt_decode(token).user.accountId;
        } catch (e) {
            // todo: log it
            console.log(`error: ${e.message}`);
            return null;
        }
    } else {
        return null;
    }
}

module.exports.getRawToken = (req) => {
    if (req.headers && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') { // Authorization: Bearer <token>
        // Handle token presented as a Bearer token in the Authorization header
        try {
            const token = req.headers.authorization.split(' ')[1];
            return jwt_decode(token);
        } catch (e) {
            // todo: log it
            console.log(`error: ${e.message}`);
            return false;
        }
    } else {
        return false;
    }
}