const { Schema } = require('mongoose');
const ApplicationVersion = require('./applicationVersion');
const constants = require('../../../utils/constants');

const s3WebsiteApplicationSchema = new Schema({
    redirect: {
        type: Boolean,
        default: false
    },
    indexDocument: {
        type: String,
        default: 'index.html'
    },
    errorDocument: {
        type: String,
        default: 'error.html'
    },
    acmCertificateArn: String
}, { toJSON: { virtuals: true } });

module.exports = ApplicationVersion.discriminator(constants.applicationKinds.s3Website, s3WebsiteApplicationSchema);