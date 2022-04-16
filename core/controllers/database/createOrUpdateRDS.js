const { handleRequest } = require('../helpers');
const DatabaseService = require('../../db/models/database/database.service');
const testInstanceClass = require('../../utils/awsDatabase');
const yup = require('yup');

async function createOrUpdateRDS(req, res, next) {
	const validationSchema = yup.object().shape({
		initial_db_name: yup
			.string()
			.required(),
		name: yup
			.string()
			.min(3, 'A minimum of 3 characters is required')
			.max(40, 'Maximum length is 40')
			.test('rds-name', 'Invalid RDS name', (value) => /^(?!.*--)[a-zA-Z]+[a-zA-Z0-9]*(?<!-)$/.test(value))
			.lowercase()
			.strict()
			.required(),
		allocated_storage: yup.number().required(),
		family: yup.string().required(),
		engine: yup
			.string()
			.oneOf([
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
			])
			.required(),
		engine_version: yup
			.string()
			// todo: update this
			// .test("engine-version", "Invalid engine version", (value) =>
			//   /^\d+.\d+(.\d+)?$/.test(value)
			// )
			.required(),
		instance_class: yup
			.string()
			// .test('instance-class', 'Invalid instance class', function(value) {
			// 	return testInstanceClass(value, this.parent.engine, this.parent.engine_version);
			// })
			.required(),
		// databaseName: yup.string()
		// 	.when('engineType', {
		// 		is: (v) => v === 'sqlserver-ex',
		// 		then: yup.string()
		// 			.notRequired(),
		// 		otherwise: yup
		// 			.string()
		// 			.min(3, 'A minimum of 3 characters is required')
		// 			.max(63, 'Maximum length is 63')
		// 			.test('database-name', 'Invalid database name', (value) =>
		// 				/^(?!.*--)[a-zA-Z]+[a-zA-Z0-9\-]*(?<!-)$/.test(value)
		// 			)
		// 			.required('Please fill out this field')
		// 	})
		// 	.lowercase()
		// 	.strict(),
		username: yup
			.string() // todo: improve validation
			.min(1, 'A minimum of 1 characters is required')
			.max(16, 'Maximum length is 16')
			.required()
			.nullable(),
		password: yup
			.string() // todo: improve validation
			.min(8, 'A minimum of 8 characters is required')
			.required(),
		port: yup.number().required(), // todo: improve validation
		multi_az: yup.boolean(),
		storage_type: yup.string().oneOf([ 'standard', 'gp2', 'io1' ]),
		iops: yup.number().when('storageType', {
			is: (v) => v === 'io1',
			then: yup.number().required()
		}).nullable(),
		publicly_accessible: yup.boolean(),
		allow_major_version_upgrade: yup.boolean(),
		auto_minor_version_upgrade: yup.boolean(),
		apply_immediately: yup.boolean(),
		maintenance_window: yup
			.string()
			.nullable(), // todo: improve validation to match ddd:hh24:mi-ddd:hh24:mi
		// skipFinalSnapshot: yup.boolean(),
		// copyTagsToSnapshot: yup.boolean(),
		backup_retention_period: yup.number()
			.nullable(),
		backup_window: yup
			.string()
			.nullable(), // todo: improve validation to match hh24:mi-hh24:mi
		tags: yup
			.object()
			.nullable(),
	});

	const handle = async () => {
		//todo: add validation
		const userId = res.locals.userId;
		const environmentId = res.locals.environmentId;

		// We handle multiple endpoints with this controller, so here we try to find out which path it is
		const isFirstVersion = req.params.version == null;
		const isUpdate = req.method === 'PUT' ? true : false;
		let version = 0;
		if (!isFirstVersion) {
			version = req.params.version;
		}
    delete req.body._id;
    delete req.body.isActivated

		let rds = {
			...req.body,
			createdBy: userId,
		};
		console.log(`rds`, JSON.stringify(rds, null, 2));

		if (isUpdate) {
			rds.version = version;
		} else if (!isFirstVersion) {
			rds.fromVersion = version;
		}

		return isFirstVersion
			? await DatabaseService.createRDS(environmentId, rds)
			: isUpdate
				? await DatabaseService.updateRDS(environmentId, rds)
				: await DatabaseService.addRDS(environmentId, rds);
	};
  
  const extractOutput = async (outputs) => outputs;

	return handleRequest({ req, res, validationSchema, handle, extractOutput });
}

exports.handler = createOrUpdateRDS;
