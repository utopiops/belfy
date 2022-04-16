const { Schema } = require('mongoose');
const DatabaseVersion = require('./databaseVersion');
const uuid = require('uuid/v4');

const rdsDetailsSchema = new Schema({
	dbsName: {
		type: String,
		required: true
	},
	allocated_storage: {
		type: Number,
		required: true
	},
	engineType: {
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
	engineVersion: {
		type: String,
		required: true
	},
	parameterGroupFamily: String,
	instanceClass: {
		type: String,
		required: true,
		enum: [
			'db.m6g.16xlarge',
			'db.m6g.12xlarge',
			'db.m6g.8xlarge',
			'db.m6g.4xlarge',
			'db.m6g.2xlarge',
			'db.m6g.xlarge',
			'db.m6g.large',
			'db.m5.24xlarge',
			'db.m5.12xlarge',
			'db.m5.8xlarge',
			'db.m5.4xlarge',
			'db.m5.2xlarge',
			'db.m5.xlarge',
			'db.m5.large',
			'db.m5.16xlarge',
			'db.m5.8xlarge',
			'db.m4.16xlarge',
			'db.m4.10xlarge',
			'db.m4.4xlarge',
			'db.m4.2xlarge',
			'db.m4.xlarge',
			'db.m4.large',
			'db.m3.2xlarge',
			'db.m3.xlarge',
			'db.m3.large',
			'db.m1.xlarge',
			'db.m1.large',
			'db.m1.medium',
			'db.m1.small',
			'db.z1d.12xlarge',
			'db.z1d.6xlarge',
			'db.z1d.3xlarge',
			'db.z1d.2xlarge',
			'db.z1d.xlarge',
			'db.z1d.large',
			'db.x1e.32xlarge',
			'db.x1e.16xlarge',
			'db.x1e.8xlarge',
			'db.x1e.4xlarge',
			'db.x1e.2xlarge',
			'db.x1e.xlarge',
			'db.x1.32xlarge',
			'db.x1.16xlarge',
			'db.r6g.16xlarge',
			'db.r6g.12xlarge',
			'db.r6g.4xlarge',
			'db.r6g.2xlarge',
			'db.r6g.xlarge',
			'db.r6g.large',
			'db.r5b.24xlarge',
			'db.r5b.16xlarge',
			'db.r5b.12xlarge',
			'db.r5b.8xlarge',
			'db.r5b.4xlarge',
			'db.r5b.2xlarge',
			'db.r5b.xlarge',
			'db.r5b.large',
			'db.r5.24xlarge',
			'db.r5.16xlarge',
			'db.r5.12xlarge',
			'db.r5.8xlarge',
			'db.r5.4xlarge',
			'db.r5.2xlarge',
			'db.r5.xlarge',
			'db.r5.large',
			'db.r4.16xlarge',
			'db.r4.8xlarge',
			'db.r4.4xlarge',
			'db.r4.2xlarge',
			'db.r4.xlarge',
			'db.r4.large',
			'db.r3.8xlarge',
			'db.r3.4xlarge',
			'db.r3.2xlarge',
			'db.r3.xlarge',
			'db.r3.large',
			'db.m2.4xlarge',
			'db.m2.2xlarge',
			'db.m2.xlarge',
			'db.t3.2xlarge',
			'db.t3.xlarge',
			'db.t3.large',
			'db.t3.medium',
			'db.t3.small',
			'db.t3.micro',
			'db.t2.2xlarge',
			'db.t2.xlarge',
			'db.t2.large',
			'db.t2.medium',
			'db.t2.small',
			'db.t2.micro'
		]
	},
	databaseName: String,
	databaseUser: {
		type: String,
		required: true
	},
	databasePassword: {
		type: String,
		required: true
	},
	databasePort: Number,
	isMultiAz: {
		type: Boolean,
		default: false
	},
	storageType: {
		type: String,
		required: true,
		enum: [ 'gp2', 'io1', 'standard' ],
		default: 'gp2'
	},
	iops: {
		type: Number,
		required: function() {
			return this.storageType === 'io1';
		}
	},
	publiclyAccessible: {
		type: Boolean,
		default: false
	},
	allowMajorVersionUpgrade: {
		type: Boolean,
		default: false
	},
	autoMinorVersionUpgrade: {
		type: Boolean,
		default: true
	},
	applyImmediately: {
		type: Boolean,
		default: false
	},
	maintenanceWindow: String,
	skipFinalSnapshot: {
		type: Boolean,
		default: true
	},
	copyTagsToSnapshot: {
		type: Boolean,
		default: true
	},
	sqlLambdaFunctionName: {
		type: String,
		default: uuid()
	},
	backupRetentionPeriod: {
		type: Number,
		default: 1
	},
	backupWindow: String
});

rdsDetailsSchema.path('databaseName').required(function() {
	return this.engineType !== 'sqlserver-ex';
});

module.exports = DatabaseVersion.discriminator('rds_old', rdsDetailsSchema);
