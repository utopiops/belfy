const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const ObjectId = mongoose.Types.ObjectId;

const modelName = 'audit';

const auditSchema = new Schema({
	user: {
		type: ObjectId,
		ref: 'User'
	},
	ip: String,
	loginTime: {
		type: Number,
		default: Date.now
	}
});

module.exports = mongoose.model(modelName, auditSchema);
