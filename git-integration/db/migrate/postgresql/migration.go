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
		Name: "create_table_application_service_provider",
		Stmt: createTableApplicationServiceProvider,
	},
	{
		Name: "create_table_gitlab_application_settings",
		Stmt: createTableGitlabApplicationSettings,
	},
	{
		Name: "create_table_github_application_settings",
		Stmt: createTableGithubApplicationSettings,
	},
	{
		Name: "create_table_bitbucket_application_settings",
		Stmt: createTableBitbucketApplicationSettings,
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

//
// 001_create_table_application_service_provider.sql
//

// This table holds the service providers for each application.
// integration_name: the name of the integration which is used to find information like the base url ( e.g. https://gitlab.example.com) and the access token
// integration_service: the type of the git provider (e.g. gitlab, github, bitbucket), though it can be inferred from the integration we keep it here too for performance
// settings_id: the id of the settings row for the provider; the table to find the row with this id is determined based on the integration_service
var createTableApplicationServiceProvider = `
CREATE TABLE IF NOT EXISTS application_service_provider (
id 												SERIAL PRIMARY KEY,
environment_name					VARCHAR(128),
application_name					VARCHAR(128),
account_id			       		VARCHAR(64),
integration_name 					VARCHAR(64),
integration_service				VARCHAR(64),
settings_id								INT NOT NULL,
UNIQUE (account_id, environment_name, application_name)
)
`

// This table holds the settings for applications having Gitlab as their provider
var createTableGitlabApplicationSettings = `
CREATE TABLE IF NOT EXISTS gitlab_application_settings (
id 												SERIAL PRIMARY KEY,
project_id								VARCHAR(128) NOT NULL
)
`

// This table holds the settings for applications having Github as their provider
var createTableGithubApplicationSettings = `
CREATE TABLE IF NOT EXISTS github_application_settings (
id 									SERIAL PRIMARY KEY,
repo_full_name						VARCHAR(128) NOT NULL
)
`

// This table holds the settings for applications having Bitbucket as their provider
var createTableBitbucketApplicationSettings = `
CREATE TABLE IF NOT EXISTS bitbucket_application_settings (
id 									SERIAL PRIMARY KEY,
repo_full_name						VARCHAR(128) NOT NULL
)
`
