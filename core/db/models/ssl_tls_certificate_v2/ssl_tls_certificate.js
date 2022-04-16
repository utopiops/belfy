const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const uuid = require('uuid/v4');
const sslTlsCertificateVersionSchema = require('./ssl_tls_certificate_version');
const sslTlsCertificateStatusValues = require('./sslTlsCertificateStatusValues');
const sslTlsCertificateStates = require('./sslTlsCertificateStates');

const modelName = 'ssl_tls_certificate_v2'

const sslTlsCertificateSchema = new Schema({
  environment: {
    type: ObjectId,
    ref: 'environment_v2'
  },
  identifier: { // This is used as the id everywhere, we don't expose _id
    type: String,
    required: true,
    default: uuid
  },
  name: { // This is optional
    type: String
  },
  domainName: {
    type: String,
    required: true,
  },
  region: {
    type: String,
  },
  activeVersion: {
    type: Number,
  },
  deployedVersion: {
    type: Number,
  },
  versions: {
    type: [sslTlsCertificateVersionSchema],
    default: []
  },
  state: {
    type: {
      code: {
        type: String,
        enum: Object.values(sslTlsCertificateStates)
      },
      reason: String, // Only for deploy_failed and destroy_failed
      jobId: String // used in the virtual. Only for deploying and destroying codes this gets a value
    },
    default: {
      code: sslTlsCertificateStates.created
    }
  },
  status: {
    type: String,
    enum: Object.values(sslTlsCertificateStatusValues),
    default: sslTlsCertificateStatusValues.pending
  }
}, { timestamps: true });


module.exports = mongoose.model(modelName, sslTlsCertificateSchema);