const Redis = require('ioredis');
var redis = new Redis({
    port: 6379, // Redis port
    host: "redis", // Redis host TODO: Get this from the config file
    family: 4, // 4 (IPv4) or 6 (IPv6)
    // password: "auth", // TODO: Get this from the config file
    db: 0
});
module.exports = redis;