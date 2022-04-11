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
		name: "create_table_application_settings_base",
		stmt: createTableApplicationSettingsBase,
	},
	{
		name: "create_table_cloudwatch_application_settings",
		stmt: createTableCloudWatchApplicationSettings,
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

// This table holds the service providers for each application.
// integration_name: the name of the integration which is used to find information like the base url ( e.g. https://gitlab.example.com) and the access token. It's null for CloudWatch
// integration_service: the type of the log provider (e.g. cloudwatch, elastic search)
// settings_id: the id of the settings row for the provider; the table to find the row with this id is determined based on the integration_service
var createTableApplicationSettingsBase = `
CREATE TABLE IF NOT EXISTS application_settings_base (
id 												SERIAL PRIMARY KEY,
environment_name					VARCHAR(128) NOT NULL,
application_name					VARCHAR(128) NOT NULL,
account_id			       		VARCHAR(64) NOT NULL,
integration_name 					VARCHAR(64),
integration_service				VARCHAR(64) NOT NULL,
settings_id								INT NOT NULL,
UNIQUE (account_id, environment_name, application_name)
)
`

// This table holds the settings for applications having cloudwatch as their provider
var createTableCloudWatchApplicationSettings = `
CREATE TABLE IF NOT EXISTS cloudwatch_application_settings (
id 												SERIAL PRIMARY KEY,
region				   					VARCHAR(25) NOT NULL
)
`
