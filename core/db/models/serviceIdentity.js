const mongoose = require('mongoose'),
    Schema = mongoose.Schema;

const modelName = 'ServiceIdentities';

const ServiceIdentities = new Schema({
    name: {
        type: 'String',
        unique: true,
        required: true
    },
    secret: {
        type: 'String',
        required: true
    }
});

module.exports = mongoose.model(modelName, ServiceIdentities);