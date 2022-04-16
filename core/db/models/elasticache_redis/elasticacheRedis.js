const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Schema = mongoose.Schema;

const modelName = 'elasticache_redis';

const elasticacheSchema = new Schema({
  environment: {
    type: ObjectId,
    ref: 'environment_v2',
  },
  display_name: {
    type: String,
    required: true,
    unique: true,
  },
  activeVersion: {
    type: Number,
  },
  deployedVersion: {
    type: Number,
  },
  versions: {
    type: [
      {
        type: ObjectId,
        ref: 'elasticache_redis_version',
      },
    ],
    default: [],
  },
  deployedAt: {
    type: Number,
  },
  deployedBy: {
    type: ObjectId,
    ref: 'User',
  },
  state: {
    type: {
      _id: false,
      code: {
        code: String,
      },
      job: String,
    },
    default: {
      code: 'created',
    },
  },
  environment_state: {
    type: {
      _id: false,
      bucket: String,
      key: String,
      region: String,
    },
  },
});

elasticacheSchema.virtual('job', {
  ref: 'Job',
  localField: 'state.job',
  foreignField: 'jobId',
  select: 'jobId',
  justOne: true,
});

module.exports = mongoose.model(modelName, elasticacheSchema);
