const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const Schema = mongoose.Schema;

const modelName = 'database_server_v2';
const environmentDatabaseServerSchema = new Schema(
	{
		environment: {
			type: ObjectId,
			ref: 'environment_v2',
			required: true
		},
		name: {
			type: String,
			required: true
		},
		kind: String, // This field is repeated in the databaseVersion schema! is it the best way?!!
		activeVersion: Number,
		deployedVersion: Number,
		versions: {
			type: [
				{
					type: ObjectId,
					ref: 'database_version_v2'
				}
			],
			default: []
		},
		deployedAt: {
			type: Number,
			default: Date.now
		},
		deployedBy: {
			type: ObjectId,
			ref: 'User'
		},
		activatedAt: {
			type: Number
		},
		activatedBy: {
			type: ObjectId,
			ref: 'User'
		},
		/*
  created: the database is created for the first time (only once in the database's lifetime)
  deploying: for the database in created state, deploy action puts it in deploying state
  deployed: a successful deploy action moves the database from deploying state to deployed state
  deploy_failed: an unsuccessful deploy action moves the database from deploying state to failed state
  destroying: for the database in created state, destroy action puts it in destroying state
  destroyed: a successful destroy action moves the database from destroying state to destroyed state
  destroy_failed: an unsuccessful destroy action moves the database from destroying state to failed state
  */
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
		lock: {
			//todo: remove if not used, here and for applications
			type: {
				_id: false,
				isLocked: Boolean, // set the other values only if this is true
				lockedAt: Date,
				id: String
			},
			default: {
				isLocked: false
			}
		}
	},
	{ toJSON: { virtuals: true } }
);

// indices
environmentDatabaseServerSchema.index({ environment: 1, name: 1 }, { unique: true });
environmentDatabaseServerSchema.virtual('job', {
	ref: 'Job',
	localField: 'state.job',
	foreignField: 'jobId',
	select: 'jobId',
	justOne: true
});

module.exports = mongoose.model(modelName, environmentDatabaseServerSchema);
