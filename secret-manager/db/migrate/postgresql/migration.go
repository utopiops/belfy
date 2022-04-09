package postgresql

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

var Migrations = []struct {
	Name string
	Stmt string
}{
	{
		Name: "create_table_simple_secrets",
		Stmt: createTableSimpleSecrets,
	},
	{
		Name: "change_type_of_value_field_of_simple_secrets_table",
		Stmt: changeTypeOfValueFieldOfSimpleSecretsTable,
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
		fmt.Print(migration.Name)
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
// 001_create_table_simple_secrets.sql
//

var createTableSimpleSecrets = `
CREATE TABLE IF NOT EXISTS simple_secrets (
id 								SERIAL PRIMARY KEY,
name							VARCHAR(128),
description						VARCHAR(256),
account_id         				VARCHAR(64),
value 							VARCHAR(256),
UNIQUE (name, account_id)
)
`

var changeTypeOfValueFieldOfSimpleSecretsTable = `
ALTER TABLE simple_secrets
ALTER COLUMN value TYPE TEXT;
`
