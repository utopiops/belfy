const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const modelName = 'LogMetricProvider';

const LogMetricProvider = new Schema({
  accountId: {
    type: 'ObjectId'
  },
  serviceProvider: {
    type: 'String',
    enum: ['cloudwatch', 'azuremonitor', 'stackdriver', 'loggly', 'elk', 'datadog', 'newrelic']
  },
  name: {
    type: 'String'
  },
  isLogProvider: {
    type: 'Boolean',
    default: false
  },
  isMetricProvider: {
    type: 'Boolean',
    default: false
  },
  credentials: {
    type: 'Object'
  },
  logSettings: {
    type: 'Object'
  },
  metricSettings: {
    type: 'Object'
  }
});

module.exports = mongoose.model(modelName, LogMetricProvider);
