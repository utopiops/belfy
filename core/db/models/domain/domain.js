const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;
const uuid = require('uuid/v4');
const timeService = require('../../../services/time.service');
const resourceStatus = require('../../../utils/constants').resourceStatus;

const modelName = 'domain';

const domainSchema = new Schema({
  domainName: {
    type: String,
    required: true,
  },
  createCertificate: {
    type: Boolean,
    default: false,
  },
  state: {
    type: {
      _id: false,
      code: {
        type: String,
        enum: Object.values(resourceStatus),
      },
      job: String,
    },
    default: {
      code: resourceStatus.created,
    },
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
  },
  deployedAt: {
    type: Number,
  },
  deployedBy: {
    type: ObjectId,
    ref: 'User',
  },
  accountId: {
    type: ObjectId,
    ref: 'Account',
    required: true,
  },
}, { timestamps: true });

domainSchema.index({ accountId: 1, domainName: 1 }, { unique: true });

module.exports = mongoose.model(modelName, domainSchema);
