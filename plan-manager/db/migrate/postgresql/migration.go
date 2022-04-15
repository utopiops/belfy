package postgresql

import (
	"database/sql"
	"log"

	_ "github.com/lib/pq"
)

var migrations = []struct {
	name string
	stmt string
}{

	{
		name: "create_migration_table",
		stmt: migrationTableCreate,
	},
	{
		name: "create_table_plans",
		stmt: createTablePlans,
	},
	{
		name: "create_table_build_time",
		stmt: createTableBuildTime,
	},
	{
		name: "create_table_account_plan",
		stmt: createTableAccountPlan,
	},
	{
		name: "create_table_application_size",
		stmt: createTableApplicationSize,
	},
	{
		name: "create_table_applications",
		stmt: createTableApplications,
	},
	{
		name: "create_table_function_call",
		stmt: createTableFunctionCall,
	},
	{
		name: "create_table_account_plan_history",
		stmt: createTableAccountPlanHistory,
	},
	{
		name: "create_table_build_time_pack",
		stmt: createTableBuildTimePack,
	},
	{
		name: "create_table_account_build_time_pack",
		stmt: createTableAccountBuildTimePack,
	},
	{
		name: "create_table_user_pack",
		stmt: createTableUserPack,
	},
	{
		name: "create_table_account_user_pack",
		stmt: createTableAccountUserPack,
	},
	{
		name: "create_table_users",
		stmt: createTableUsers,
	},
	{
		name: "create_table_bandwidth",
		stmt: createTableBandwidth,
	},
}

// Migrate performs the database migration. If the migration fails
// and error is returned.
func Migrate(db *sql.DB) error {
	if err := createMigrationHistoryTable(db); err != nil {
		return err
	}
	completed, err := selectCompletedMigrations(db)
	if err != nil && err != sql.ErrNoRows {
		return err
	}
	for _, migration := range migrations {
		log.Print(migration.name)
		if _, ok := completed[migration.name]; ok {
			log.Println(" skipped")
			continue
		}

		log.Println(" executing")
		if _, err := db.Exec(migration.stmt); err != nil {
			return err
		}
		if err := addMigration(db, migration.name); err != nil {
			return err
		}

	}
	return nil
}

func createMigrationHistoryTable(db *sql.DB) error {
	_, err := db.Exec(migrationTableCreate)
	return err
}

func addMigration(db *sql.DB, name string) error {
	_, err := db.Exec(migrationInsert, name)
	return err
}

func selectCompletedMigrations(db *sql.DB) (map[string]struct{}, error) {
	migrations := map[string]struct{}{}
	rows, err := db.Query(migrationSelect)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return nil, err
		}
		migrations[name] = struct{}{}
	}
	return migrations, nil
}

//
// migration table ddl and sql
//

var migrationTableCreate = `
CREATE TABLE IF NOT EXISTS migration_history (
name VARCHAR(255),
UNIQUE(name)
)
`

var migrationInsert = `
INSERT INTO migration_history (name) VALUES ($1)
`

var migrationSelect = `
SELECT name FROM migration_history
`

// var createTableServicePlans = `
// create table if not exists service_plans
// (
//     service varchar(128) not null,
//     kind varchar(32)  not null,
//     url  varchar(256) not null,
//     info jsonb        not null,
//     PRIMARY KEY (service, kind),
//     FOREIGN KEY (kind) references plans(name)
// );
// `

var createTablePlans = `
create table if not exists plans
(
    name           varchar(32) not null
        primary key,
    price          integer     not null,
    build_time_price integer     not null,
    bandwidth      integer     not null,
    build_time     integer     not null,
    users          integer     not null,
    function_call  integer     not null,
    rules          jsonb       not null
);`

var createTableBuildTime = `
create table if not exists build_time
(
    account_id varchar(128) not null,
    create_at  timestamp default now(),
    app_name   varchar(255),
    app_type   varchar(128),
    seconds    integer      not null
);`

var createTableAccountPlan = `
create table if not exists account_plan
(
    account_id    varchar(128) primary key,
    plan          varchar(32) not null references plans(name),
    start_at      timestamp default now(),
    end_at        timestamp   not null,
    function_call integer   default 0,
    bandwidth     integer   default 0,
    build_time    integer   default 0,
    users         integer   default 0
);
`
var createTableApplicationSize = `
create table if not exists application_size (
    name varchar(63) primary key,
    fee numeric
);
`

var createTableApplications = `
create table if not exists applications
(
    account_id varchar(128) not null,
    name       varchar(255) not null,
    domain     varchar(255) 		,
    kind       varchar(63)  ,
    size       varchar(63)  ,
    create_at  timestamp default now(),
    end_at     timestamp,
    primary key (name, domain),
    foreign key (size) references application_size (name)
);
`
var createTableFunctionCall = `
create table if not exists function_call
(
    account_id       varchar(128) not null,
    function_name    varchar(255) not null,
    application_name varchar(255) not null,
    create_at        timestamp default now(),
	paid			 bool
);`

var createTableAccountPlanHistory = `
create table if not exists account_plan_history
(
    account_id varchar(128),
    action     varchar(32) not null,
    last_plan  varchar(32) references plans (name),
    new_plan   varchar(32) references plans (name),
    create_at  timestamp default now()
);
`

var createTableBuildTimePack = `
create table if not exists build_time_pack (
    id serial primary key,
    minutes int not null unique,
    fee numeric not null
);`

var createTableAccountBuildTimePack = `
create table if not exists account_build_time_pack
(
    account_id varchar(128)            not null,
    create_at  timestamp default now() not null,
    minutes    int                     not null,
    fee        numeric                 not null,
    action     varchar(32)             not null
);`

var createTableUserPack = `
create table  if not exists user_pack(
    id serial primary key,
    count int not null unique,
    fee numeric not null
);`

var createTableAccountUserPack = `
create table if not exists account_user_pack
(
    account_id varchar(128) not null,
    count      int          not null,
    fee        numeric      not null,
    create_at  timestamp default now()
);`

var createTableUsers = `
create table if not exists users
(
    account_id varchar(128) not null,
    username   varchar(128) not null,
    create_at  timestamp default now(),
    end_at     timestamp
);`

var createTableBandwidth = `
create table if not exists bandwidth
(
    account_id       varchar(128) not null,
    application varchar(128) not null,
    domain           varchar(255),
    bandwidth        int          not null,
    start_at         timestamp,
    end_at           timestamp,
	paid			 bool
);`
