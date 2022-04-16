const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Schema = mongoose.Schema;
const TerraformModuleVerison = require('./terraformModuleVersion');
const timeService = require('../../../services/time.service');

const modelName = 'terraform_module';
const terraformModuleSchema = new Schema({
	name: String,
	gitService: String,
	state: {
		type: {
			_id: false,
			code: {
				code: String
			},
			job: String
		},
		default: {
			code: 'created' // We don't provide reason for the state code ⏩created⏪
		}
	},
	repositoryUrl: String,
	environment: {
		type: ObjectId,
		ref: 'environment_v2'
	},
	activeVersion: Number,
	deployedVersion: Number,
  createdBy: {
    type: ObjectId,
    ref: 'User'
  },
	secretName: {
		type: String,
		default: ''
	},
	values: {
		default: [],
		type: [
			{
				_id: false,
				key: {
					type: String,
					required: true
				},
				value: {
					type: String,
					required: true
				}
			}
		]
	},
	secrets: {
		default: [],
		type: [
			{
				_id: false,
				key: {
					type: String,
					required: true
				},
				value: {
					type: String,
					required: true
				}
			}
		]
	},
	versions: [TerraformModuleVerison]
}, { timestamps: true });

module.exports = mongoose.model(modelName, terraformModuleSchema);