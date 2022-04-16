const { Schema } = require('mongoose');
const DatabaseVersion = require('./databaseVersion');
const uuid = require('uuid/v4');

const rdsDetailsSchema = new Schema({
	initial_db_name: {
		type: String,
		required: true
	},
	allocated_storage: {
		type: Number,
		required: true
	},
	engine: {
		type: String,
		required: true,
		enum: [
			'aurora',
			'aurora-mysql',
			'aurora-postgresql',
			'mariadb',
			'mysql',
			'oracle-ee',
			'oracle-se2',
			'oracle-se1',
			'oracle-se',
			'postgres',
			'sqlserver-ee',
			'sqlserver-se',
			'sqlserver-ex',
			'sqlserver-web'
		]
	},
	engine_version: {
		type: String,
		required: true
	},
	family: {
    type: String,
    required: true
  },
	instance_class: {
		type: String,
		required: true
	},
	username: {
		type: String,
		default: null
	},
	password: {
		type: String,
		default: ""
	},
	port: {
		type: Number,
    required: true
	},
	multi_az: {
		type: Boolean,
		default: false
	},
	storage_type: {
		type: String,
		required: true,
		enum: [ 'gp2', 'io1', 'standard' ],
		default: 'gp2'
	},
	iops: {
		type: Number,
		required: function() {
			return this.storageType === 'io1';
		},
		default: 0
	},
	publicly_accessible: {
		type: Boolean,
		default: false
	},
	allow_major_version_upgrade: {
		type: Boolean,
		default: false
	},
	auto_minor_version_upgrade: {
		type: Boolean,
		default: true
	},
	apply_immediately: {
		type: Boolean,
		default: false
	},
	maintenance_window: {
		type: String,
		default: null
	},
	backup_retention_period: {
		type: Number,
		default: null
	},
	backup_window: {
		type: String,
		default: null
	},
	tags: {
		type: Object,
		default: null
	}
});

// rdsDetailsSchema.path('databaseName').required(function() {
// 	return this.engineType !== 'sqlserver-ex';
// });

module.exports = DatabaseVersion.discriminator('rds', rdsDetailsSchema);
