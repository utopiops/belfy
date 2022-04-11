package postgresql

import (
	"database/sql"
	"log"

	_ "github.com/lib/pq"
)

var Migrations = []struct {
	Name string
	Stmt string
}{
	{
		Name: "create_table_database_settings_base",
		Stmt: createTableDatabaseSettingsBase,
	},
	{
		Name: "create_table_rds_database_settings",
		Stmt: createTableRDSDatabaseSettings,
	},
	{
		Name: "create_table_query_history",
		Stmt: createTableQueryHistory,
	},
	{
		Name: "add_database_engine_field_to_database_settings_base_table",
		Stmt: addDatabaseEngineFieldToDatabaseSettingsBaseTable,
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
	for _, migration := range Migrations {
		log.Print(migration.Name)
		if _, ok := completed[migration.Name]; ok {
			log.Println(" skipped")
			continue
		}

		log.Println(" executing")
		if _, err := db.Exec(migration.Stmt); err != nil {
			return err
		}
		if err := addMigration(db, migration.Name); err != nil {
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

// This table holds the service providers for each application.
// integration_name: the name of the integration which is used to find information like the base url ( e.g. https://gitlab.example.com) and the access token. It's null for CloudWatch
// integration_service: the type of the log provider (e.g. cloudwatch, elastic search)
// settings_id: the id of the settings row for the provider; the table to find the row with this id is determined based on the integration_service
var createTableDatabaseSettingsBase = `
CREATE TABLE IF NOT EXISTS database_settings_base (
id 												SERIAL PRIMARY KEY,
environment_name					VARCHAR(128) NOT NULL,
database_name							VARCHAR(128) NOT NULL,
account_id			       		VARCHAR(64) NOT NULL,
database_kind		 					VARCHAR(32)  NOT NULL CHECK (database_kind IN ('rds')),
is_deleted								BOOLEAN NOT NULL DEFAULT 'f',

UNIQUE (account_id, environment_name, database_name),
UNIQUE (id, database_kind)
)
`

// This table holds the settings for RDS databases
var createTableRDSDatabaseSettings = `
CREATE TABLE IF NOT EXISTS rds_database_settings (
database_id								INT PRIMARY KEY,
database_kind		 					VARCHAR(32)  NOT NULL CHECK (database_kind = ('rds')),
lambda_name								VARCHAR(128) NOT NULL,
region				   					VARCHAR(25) NOT NULL,
dns												VARCHAR(25) NOT NULL,

FOREIGN KEY(database_id, database_kind) REFERENCES database_settings_base(id, database_kind)
)
`

var createTableQueryHistory = `
CREATE TABLE IF NOT EXISTS query_history (
id 												SERIAL PRIMARY KEY,
database_id								INT NOT NULL,
statement									VARCHAR(1024) NOT NULL,
created_at								TIMESTAMP,

FOREIGN KEY(database_id) REFERENCES database_settings_base(id)
)
`

var addDatabaseEngineFieldToDatabaseSettingsBaseTable = `
ALTER TABLE database_settings_base
ADD COLUMN IF NOT EXISTS database_engine 		VARCHAR(32)
`
