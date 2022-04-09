const axios = require('axios');
const config = require('../config');

// TODO: Implement the token piece completely (generation specifically)
var options = {
    headers: { Authorization: "Bearer " + config.authToken }
};

exports.get = (url) => {
    return axios.get(url, options);
}

exports.post = (url, data) => {
    return axios.post(url, data, options);
}

exports.put = (url, data) => {
    return axios.put(url, data, options);
}

exports.patch = (url, data) => {
    return axios.patch(url, data, options);
}

exports.delete = (url, data) => {
    return axios.delete(url, data, options);
}