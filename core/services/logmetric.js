const LogMetric = require('../db/models/logmetricProvider');
const mongoose = require('mongoose');

exports.add = async (provider) => {
  const logmetric = new LogMetric(provider)
  return await logmetric.save();
}

exports.edit = async (provider, accountId) => {
  console.log(`id: ${provider._id}`);
  const filter = { _id: provider._id, accountId };
  const logmetric = await LogMetric.findOne(filter);
  if (!logmetric) {
    throw new Error('Entity not found')
  }
  if (logmetric.toJSON().serviceProvider !== provider.serviceProvider) {
    const error = new Error('Service provider cannot change');
    error.name = 'IllegalOperation';
    throw error;
  }
  return await LogMetric.updateOne(filter, {$set: provider}).exec();
}

exports.delete = async (providerId, accountId) => {
  const filter = { _id: providerId, accountId };
  return await LogMetric.findOneAndDelete(filter).exec();
}

exports.get = async (providerIds, accountId) => {
  var filter = {accountId};
  if (providerIds) {
    filter = {
      _id: {
        $in: providerIds.map(p => mongoose.Types.ObjectId(p))
      }
    };
  }
  return await LogMetric.find(filter).exec();
}