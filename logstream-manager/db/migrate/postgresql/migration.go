package postgresql

import (
	"database/sql"

	_ "github.com/lib/pq"
)

var Migrations = []struct {
	Name string
	Stmt string
}{
	{
		Name: "create-table-logs",
		Stmt: createTableLogs,
	},
	{
		Name: "change_type_of_payload_field_of_logs_table",
		Stmt: changeTypeOfPayloadFieldOfLogsTable,
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
		if _, ok := completed[migration.Name]; ok {

			continue
		}

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
 name VARCHAR(255)
,UNIQUE(name)
)
`

var migrationInsert = `
INSERT INTO migration_history (name) VALUES ($1)
`

var migrationSelect = `
SELECT name FROM migration_history
`

//
// 001_create_table_logs.sql
//

var createTableLogs = `
CREATE TABLE IF NOT EXISTS logs (
job_id         		VARCHAR(100)
,line_number        INTEGER
,payload		        VARCHAR(1000)
,is_last_line       BOOLEAN
);
`

var changeTypeOfPayloadFieldOfLogsTable = `
ALTER TABLE logs
ALTER COLUMN payload TYPE TEXT;
`
