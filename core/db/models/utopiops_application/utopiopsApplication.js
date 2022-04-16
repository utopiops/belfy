const mongoose = require('mongoose');
const ObjectId = require('mongoose').Types.ObjectId
const Schema = mongoose.Schema;

const modelName = 'utopiops_application';
const utopiopsApplicationSchema = new Schema({
  jenkinsState: {
    type: {
        _id: false,
        code: String
    },
    default: {
      code: 'created' // We don't provide reason for the state code ⏩created⏪
    }
  },
  accountId: {
      type: ObjectId,
      required: true
  },
  createdBy: {
    type: ObjectId
  },
  name: String,
  description: String,
  kind: String,
  jobName: {
    type: String,
  },
}, { discriminatorKey: 'kind', _id: false });

// indices
utopiopsApplicationSchema.index({ accountId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model(modelName, utopiopsApplicationSchema);