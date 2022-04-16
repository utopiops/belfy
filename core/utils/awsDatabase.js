const semver = require('semver');

function testInstanceClass(value, engineType, engineVersion) {
	console.log(value, engineType, engineVersion);
	if (!/^db\.[a-z][a-z1-9]{1,2}\..{5,8}$/.test(value)) {
		return false;
	}

	let engineTypeMapped = engineType.includes('postgres')
		? 'postgres'
		: engineType.includes('sqlserver')
			? 'sqlserver'
			: engineType.includes('mariadb')
				? 'mariadb'
				: engineType.includes('mysql')
					? 'mysql'
					: engineType.includes('aurora') ? 'mysql' : engineType.includes('oracle') ? 'oracle' : 'invalid';

	if ([ 'sqlserver', 'oracle' ].indexOf(engineTypeMapped) !== -1) {
		return true; // TODO: Update the validations for these two engine types
	}

	// See: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.html
	// # Supported DB engines for DB instance classes
	const validValues = {
		'db.m6g.(16xlarge|12xlarge|8xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '10.5.x', '>=10.4.13' ],
			sqlserver: [],
			mysql: [ '>=8.0.17' ],
			oracle: [],
			postgres: [ '12.3.x' ]
		},
		'db.m5.(24xlarge|12xlarge|8xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>0.x' ]
		},
		'db.m5.(16xlarge|8xlarge)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>=11.6', '>=10.11', '>=9.6.16', '>=9.5.20' ]
		},
		'db.m4.(16xlarge)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '8.0.x', '5.7.x', '5.6.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>0.x' ]
		},
		'db.m4.(10xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>0.x' ]
		},
		'db.m3.(2xlarge|xlarge|large)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [],
			postgres: [ '>0.x' ]
		},
		'db.m1.(xlarge|large|medium|small)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [],
			oracle: [],
			postgres: []
		},
		'db.z1d.(12xlarge|6xlarge|3xlarge|2xlarge|xlarge|large)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [],
			oracle: [ '>0.x' ],
			postgres: []
		},
		'db.x1e.(32xlarge|16xlarge|8xlarge|4xlarge|2xlarge|xlarge)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [],
			oracle: [ '>0.x' ],
			postgres: []
		},
		'db.x1.(32xlarge|16xlarge)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [],
			oracle: [ '>0.x' ],
			postgres: []
		},
		'db.r6g.(16xlarge|12xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '10.5.x', '>=10.4.13' ],
			sqlserver: [],
			mysql: [ '>=8.0.17' ],
			oracle: [],
			postgres: [ '12.13.x' ]
		},
		'db.r5b.(24xlarge|16xlarge|12xlarge|8xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [],
			oracle: [ '>0.x' ],
			postgres: []
		},
		'db.r5.(24xlarge|16xlarge|12xlarge|8xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>=11.6', '>=10.11', '>=9.6.16', '>=9.5.20' ]
		},
		'db.r4.(16xlarge|8xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '8.0.x', '5.7.x', '5.6.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>0.x' ]
		},
		'db.r3.(8xlarge|4xlarge|2xlarge|xlarge|large)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [],
			postgres: [ '>0.x' ]
		},
		'db.m2.(4xlarge|2xlarge|xlarge)': {
			mariadb: [],
			sqlserver: [ '>0.x' ],
			mysql: [],
			oracle: [],
			postgres: []
		},
		'db.t3.(2xlarge|xlarge|large|medium|small|micro)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [ '>0.x' ],
			postgres: [ '>0.x' ]
		},
		'db.t2.(2xlarge|xlarge)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '8.0.x', '5.7.x', '5.6.x' ],
			oracle: [],
			postgres: [ '9.6.x', '9.5.x' ]
		},
		'db.t2.(large|medium|small|micro)': {
			mariadb: [ '>0.x' ],
			sqlserver: [ '>0.x' ],
			mysql: [ '>0.x' ],
			oracle: [],
			postgres: [ '>0.x' ]
		}
	};

	let found = false;
	let allowed = [];
	Object.keys(validValues).findIndex((k) => {
		const r = new RegExp(`^${k}\$`);
		if (r.test(value)) {
			allowed = validValues[k][engineTypeMapped];
			found = true;
		}
	});
	if (!found) {
		return false;
	}
	if (!allowed.length) {
		return false;
	}
	return /^\d+.\d+$/.test(engineVersion)
		? semver.satisfies(`${engineVersion}.0`, allowed.join('||'))
		: semver.satisfies(engineVersion, allowed.join('||'));
}

module.exports = testInstanceClass;
