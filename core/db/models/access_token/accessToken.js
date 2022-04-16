const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const modelName = 'access_token';

const accessTokenSchema = new Schema({
	accountId: {
		type: ObjectId,
		ref: 'Account'
	},
	token: {
    type: String,
    required: true
  },
  createdBy: {
    type: ObjectId,
    ref: 'User'
  },
}, { timestamps: true });

module.exports = mongoose.model(modelName, accessTokenSchema);
