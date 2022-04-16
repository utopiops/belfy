const { Schema } = require('mongoose');

// Azure Environment schema
const azureEnvironmentSchema = new Schema({
  enableVnetDdosProtection: {
    type: Boolean,
    default: false
  }
}, { _id: false });

module.exports = azureEnvironmentSchema;
