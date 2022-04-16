const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Schema = mongoose.Schema;
const timeService = require('../../../services/time.service');

const modelName = 'elasticache_redis_version';

const applicationAlarmSchema = new Schema({
  elasticache: {
    type: ObjectId,
    ref: 'elasticache_redis',
  },
  version: {
    type: Number,
    default: 1,
  },
  fromVersion: {
    type: Number,
    default: 0,
  },
  isActivated: {
    // This is a flag indicating whether the application version can be modified or not
    type: Boolean,
    default: false,
  },
  engine_version: {
    type: String,
    default: '6.x',
  },
  node_type: {
    type: String,
    required: true,
  },
  is_cluster_mode_disabled: {
    type: Boolean,
    default: true,
  },
  number_cache_clusters: {
    type: Number,
    default: 0,
  },
  createdBy: {
    type: ObjectId,
    ref: 'User',
  },
  replicas_per_node_group: {
    type: Number,
    default: 0,
  },
  num_node_groups: {
    type: Number,
    default: 0,
  },
}, { timestamp: true });

module.exports = mongoose.model(modelName, applicationAlarmSchema);
